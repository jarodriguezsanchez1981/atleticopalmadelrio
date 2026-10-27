#!/usr/bin/env python3
"""Lee los partidos de una jornada de liga en RFAF (NFG_CmpJornada) y los
devuelve en JSON por stdout: por partido, el código del acta, los dos equipos
(nombre y código de RFAF), la fecha y la hora. El equipo que descansa no es un
partido y no sale. El marcador no se lee de aquí (RFAF lo oculta): sale del
acta de cada partido (rfaf_acta.py).

La descarga es la misma que la del acta (sesión de RFAF_COOKIE, ver
rfaf_acta.py): una petición con la sesión viva, sin reintentos.

Uso:
  rfaf_jornada.py <cod_primaria> <codgrupo> <codcompeticion> <codtemporada> <jornada>
  rfaf_jornada.py --html <fichero>      parsea un HTML ya guardado (tests)

Salida con error: {"error": "..."} y código de salida 1.
"""

import json
import re
import sys

from bs4 import BeautifulSoup

from rfaf_acta import descargar, limpiar

URL_JORNADA = "https://www.rfaf.es/pnfg/NPcd/NFG_CmpJornada"


def parametro(href, nombre):
    m = re.search(rf"[?&]{nombre}=([^&]+)", href or "")
    return m.group(1) if m else None


def parsear_jornada(html):
    soup = BeautifulSoup(html, "html.parser")
    jornada = None
    m = re.search(r"Jornada\s+(\d+)\s+Siguiente", limpiar(soup.get_text(" ")))
    if m:
        jornada = int(m.group(1))

    partidos = []
    vistos = set()
    # Cada partido es una tabla con los dos equipos (enlaces a NFG_VisEquipos)
    # y el botón del acta (enlace a NFG_CmpPartido).
    for tabla in soup.find_all("table"):
        acta = tabla.find("a", href=re.compile(r"NFG_CmpPartido"))
        equipos = tabla.select("h4 a[href*=NFG_VisEquipos]")
        if not acta or len(equipos) != 2 or tabla.find("table"):
            continue
        codigo_acta = parametro(acta["href"], "CodActa") or parametro(acta["href"], "cod_acta")
        if not codigo_acta or codigo_acta in vistos:
            continue
        vistos.add(codigo_acta)
        horario = [limpiar(s.get_text()) for s in tabla.select("span.horario")]
        fecha = next((h for h in horario if re.fullmatch(r"\d{2}-\d{2}-\d{4}", h)), None)
        hora = next((h for h in horario if re.fullmatch(r"\d{1,2}:\d{2}", h)), None)
        partidos.append({
            "codigo_acta": codigo_acta,
            "equipo_local": limpiar(equipos[0].get_text()),
            "codigo_equipo_local": parametro(equipos[0]["href"], "Codigo_Equipo"),
            "equipo_visitante": limpiar(equipos[1].get_text()),
            "codigo_equipo_visitante": parametro(equipos[1]["href"], "Codigo_Equipo"),
            "fecha": f"{fecha[6:10]}-{fecha[3:5]}-{fecha[0:2]}" if fecha else None,
            "hora": hora,
        })
    if not partidos:
        raise RuntimeError("La página de RFAF no trae los partidos de la jornada.")
    return {"jornada": jornada, "partidos": partidos}


def main(argv):
    try:
        cookie = ""
        if len(argv) == 3 and argv[1] == "--html":
            with open(argv[2], encoding="utf-8") as f:
                html = f.read()
        elif len(argv) == 6:
            cod_primaria, codgrupo, codcompeticion, codtemporada, jornada = argv[1:]
            html, cookie = descargar(URL_JORNADA, {
                "cod_primaria": cod_primaria, "CodCompeticion": codcompeticion, "CodGrupo": codgrupo,
                "CodTemporada": codtemporada, "CodJornada": jornada,
            }, "la jornada")
        else:
            raise RuntimeError("Uso: rfaf_jornada.py <cod_primaria> <codgrupo> <codcompeticion> <codtemporada> <jornada>"
                               " | --html <fichero>")
        print(json.dumps({**parsear_jornada(html), "cookie": cookie}, ensure_ascii=False))
        return 0
    except Exception as e:  # noqa: BLE001 - cualquier fallo se devuelve como JSON
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
