#!/usr/bin/env python3
"""Lee la clasificación de una jornada de liga en RFAF (NFG_VisClasificacion) y
la devuelve en JSON por stdout: jornada, fecha y, por equipo, posición,
puntos, partidos (en total, en casa y fuera), goles y puntos de sanción.

La descarga es la misma que la del acta (sesión de RFAF_COOKIE, ver
rfaf_acta.py): una petición con la sesión viva, sin reintentos.

Uso:
  rfaf_clasificacion.py <cod_primaria> <codgrupo> <codcompeticion> <jornada>
  rfaf_clasificacion.py --html <fichero>      parsea un HTML ya guardado (tests)

Salida con error: {"error": "..."} y código de salida 1.
"""

import json
import re
import sys

from bs4 import BeautifulSoup

from rfaf_acta import descargar, limpiar

URL_CLASIFICACION = "https://www.rfaf.es/pnfg/NPcd/NFG_VisClasificacion"

# Columnas de la tabla completa (la que tiene "Partidos Casa"), tras la celda
# vacía del principio: posición, equipo, puntos, casa (J G E P), fuera
# (J G E P), goles (F C), últimos resultados y puntos de sanción.
CAMPOS_CASA = ["jugados_casa", "ganados_casa", "empatados_casa", "perdidos_casa"]
CAMPOS_FUERA = ["jugados_fuera", "ganados_fuera", "empatados_fuera", "perdidos_fuera"]


def numero(texto):
    m = re.search(r"-?\d+", texto or "")
    return int(m.group()) if m else 0


def tabla_completa(soup):
    for tabla in soup.find_all("table"):
        cabecera = tabla.find("tr")
        if cabecera and "Partidos Casa" in cabecera.get_text():
            return tabla
    return None


def parsear_clasificacion(html):
    soup = BeautifulSoup(html, "html.parser")
    jornada, fecha = None, None
    m = re.search(r"Jornada\s+(\d+)\s*\((\d{2})-(\d{2})-(\d{4})\)", soup.get_text(" "))
    if m:
        jornada = int(m.group(1))
        fecha = f"{m.group(4)}-{m.group(3)}-{m.group(2)}"

    tabla = tabla_completa(soup)
    if tabla is None:
        raise RuntimeError("La página de RFAF no trae la tabla de clasificación.")

    equipos = []
    for fila in tabla.find_all("tr"):
        celdas = fila.find_all("td")
        if len(celdas) < 16 or not limpiar(celdas[1].get_text()).isdigit():
            continue
        textos = [limpiar(c.get_text(" ")) for c in celdas]
        enlace = celdas[2].find("a")
        cod = re.search(r"codequipo=(\d+)", enlace.get("href", "")) if enlace else None
        casa = [numero(t) for t in textos[4:8]]
        fuera = [numero(t) for t in textos[8:12]]
        equipo = {
            "posicion": int(textos[1]),
            "equipo": textos[2],
            "codigo_equipo": cod.group(1) if cod else None,
            "puntos": numero(textos[3]),
            **dict(zip(CAMPOS_CASA, casa)),
            **dict(zip(CAMPOS_FUERA, fuera)),
            "goles_favor": numero(textos[12]),
            "goles_contra": numero(textos[13]),
            "puntos_sancion": numero(textos[15]),
        }
        for campo, i in (("jugados", 0), ("ganados", 1), ("empatados", 2), ("perdidos", 3)):
            equipo[campo] = casa[i] + fuera[i]
        equipos.append(equipo)

    if not equipos:
        raise RuntimeError("La clasificación de RFAF no trae ningún equipo.")
    return {"jornada": jornada, "fecha": fecha, "equipos": equipos}


def main(argv):
    try:
        cookie = ""
        if len(argv) == 3 and argv[1] == "--html":
            with open(argv[2], encoding="utf-8") as f:
                html = f.read()
        elif len(argv) == 5:
            cod_primaria, codgrupo, codcompeticion, jornada = argv[1:]
            html, cookie = descargar(URL_CLASIFICACION, {
                "cod_primaria": cod_primaria, "codgrupo": codgrupo,
                "codcompeticion": codcompeticion, "codjornada": jornada,
            }, "la clasificación")
        else:
            raise RuntimeError("Uso: rfaf_clasificacion.py <cod_primaria> <codgrupo> <codcompeticion> <jornada>"
                               " | --html <fichero>")
        print(json.dumps({**parsear_clasificacion(html), "cookie": cookie}, ensure_ascii=False))
        return 0
    except Exception as e:  # noqa: BLE001 - cualquier fallo se devuelve como JSON
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
