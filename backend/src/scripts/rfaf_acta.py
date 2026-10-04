#!/usr/bin/env python3
"""Lee el acta oficial de un partido en RFAF (NFG_CmpPartido) y la devuelve
en JSON por stdout: equipos, jugadores que han jugado (titulares y
suplentes), goles, tarjetas amarillas/rojas, resultado y la cookie de sesión.

RFAF entrega el acta a cualquier visitante, pero exige una sesión (anónima):
sin ella responde 302 a /pnfg/NLogin, que crea la sesión y redirige de vuelta
al acta, igual que pasa al abrirla en un navegador. Desde la IP del servidor
(AWS) RFAF no crea sesiones útiles (devuelve el acta vacía), así que allí la
primera sesión es la JSESSIONID de un navegador, en RFAF_COOKIE. Para pedir a rfaf.es lo
mínimo (su robots.txt no admite robots), la sesión obtenida se devuelve en
"cookie" y el backend la pasa en RFAF_COOKIE la siguiente vez: con la sesión
viva basta una petición; si ha caducado son tres (acta, NLogin y acta). Solo
se siguen esas redirecciones, nunca a otra página, y sin reintentos.

Uso:
  rfaf_acta.py <cod_primaria> <cod_acta>   descarga y parsea el acta
  rfaf_acta.py --html <fichero>            parsea un HTML ya guardado (tests)

Salida con error: {"error": "..."} y código de salida 1.
"""

import json
import os
import re
import sys
import unicodedata

from bs4 import BeautifulSoup

URL_ACTA = "https://www.rfaf.es/pnfg/NPcd/NFG_CmpPartido"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/154.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}


MAX_PETICIONES = 3


def descargar_acta(cod_primaria, cod_acta):
    """Devuelve (html, cookie). Ver el docstring del módulo."""
    import requests
    from urllib.parse import urljoin, urlparse

    sesion = requests.Session()
    sesion.headers.update(HEADERS)
    cookie = os.environ.get("RFAF_COOKIE", "").strip()
    if cookie:
        sesion.headers["Cookie"] = cookie

    url = requests.Request("GET", URL_ACTA, params={"cod_primaria": cod_primaria, "CodActa": cod_acta}).prepare().url
    siguiente = url
    for _ in range(MAX_PETICIONES):
        res = sesion.get(siguiente, timeout=30, allow_redirects=False)
        nueva = res.cookies.get("JSESSIONID")
        if nueva:
            # La sesión anterior ya no vale: a partir de aquí, la nueva.
            sesion.headers["Cookie"] = f"JSESSIONID={nueva}"
        if not 300 <= res.status_code < 400:
            break
        destino = urljoin(siguiente, res.headers.get("Location") or "")
        parsed = urlparse(destino)
        # Solo el ida y vuelta por NLogin que hace RFAF para crear la sesión.
        if parsed.netloc != "www.rfaf.es" or (parsed.path != "/pnfg/NLogin" and destino != url):
            raise RuntimeError(f"RFAF ha redirigido a una página inesperada ({destino}).")
        siguiente = destino
    else:
        raise RuntimeError("RFAF no ha entregado el acta (demasiadas redirecciones).")

    if res.status_code != 200:
        raise RuntimeError(f"RFAF respondió {res.status_code} al pedir el acta.")
    res.encoding = res.encoding or "utf-8"
    if not res.text.strip():
        # Pasa cuando la sesión no vale y RFAF no la deja crear (p.ej. desde
        # la IP del servidor): hay que dar una JSESSIONID de un navegador.
        raise RuntimeError("RFAF ha devuelto el acta vacía: la sesión de RFAF no es válida, "
                           "hay que poner una JSESSIONID nueva en RFAF_COOKIE.")
    return res.text, sesion.headers.get("Cookie", "")


def limpiar(texto):
    return re.sub(r"\s+", " ", texto or "").strip()


def normalizar_nombre(texto):
    """"Pérez Gómez, Juan" -> "PEREZ GOMEZ JUAN" (mismo criterio que el backend)."""
    texto = unicodedata.normalize("NFD", limpiar(texto).upper())
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", texto.replace(",", " ")).strip()


def texto_sin_minuto(td):
    """Celda "<span>(22')</span> APELLIDOS, NOMBRE" -> (nombre, minuto)."""
    span = td.find("span")
    minuto = None
    if span:
        m = re.search(r"\d+", span.get_text())
        minuto = int(m.group()) if m else None
        span.extract()
    return limpiar(td.get_text()), minuto


def tabla_tras(etiqueta):
    return etiqueta.find_next("table") if etiqueta else None


def jugadores_de(bloque, titulo, titular):
    h5 = next((h for h in bloque.find_all("h5") if limpiar(h.get_text()) == titulo), None)
    tabla = tabla_tras(h5)
    jugadores = []
    if not tabla:
        return jugadores
    for tr in tabla.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue
        nombre = limpiar(tds[2].get_text())
        if not nombre:
            continue
        dorsal = limpiar(tds[0].get_text())
        jugadores.append({
            "dorsal": int(dorsal) if dorsal.isdigit() else None,
            "nombre": nombre,
            "titular": titular,
            "goles": 0,
            "tarjeta_amarilla": 0,
            "tarjeta_roja": 0,
        })
    return jugadores


def tarjetas_de(bloque):
    h4 = next((h for h in bloque.find_all("h4") if limpiar(h.get_text()) == "Tarjetas"), None)
    tabla = tabla_tras(h4)
    tarjetas = []
    if not tabla:
        return tarjetas
    for tr in tabla.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 2:
            continue
        img = tds[0].find("img")
        src = (img.get("src") if img else "") or ""
        tipo = "roja" if "tarj_roja" in src else ("amarilla" if "tarj_amar" in src else None)
        nombre, _ = texto_sin_minuto(tds[1])
        if tipo and nombre:
            tarjetas.append((tipo, normalizar_nombre(nombre)))
    return tarjetas


def goles_del_partido(soup):
    """Goles de todo el partido. El color del balón indica el tipo: verde =
    normal, azul = penalti, rojo = en propia puerta."""
    goles = []
    for div in soup.select("div.number"):
        if limpiar(div.get_text()) != "Goles":
            continue
        tabla = div.parent.find("table")
        if not tabla:
            continue
        for tr in tabla.find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) < 2:
                continue
            icono = tds[0].find("i")
            color = re.sub(r"\s+", "", (icono.get("style") if icono else "") or "").lower()
            tipo = "propia" if "color:red" in color else (
                "penalti" if ("rgb(21,114,228)" in color or "#1572e4" in color) else "normal")
            nombre, minuto = texto_sin_minuto(tds[1])
            if nombre:
                goles.append({"tipo": tipo, "nombre": nombre, "minuto": minuto})
    return goles


def parsear_acta(html):
    soup = BeautifulSoup(html, "html.parser")

    # Cada equipo es un div.dashboard-stat con su nombre en .number y las
    # tablas "Titulares"/"Suplentes"; el primero es el local.
    equipos = []
    for bloque in soup.select("div.dashboard-stat"):
        numero = bloque.select_one(".number")
        if not numero or not any(limpiar(h.get_text()) == "Titulares" for h in bloque.find_all("h5")):
            continue
        jugadores = jugadores_de(bloque, "Titulares", True) + jugadores_de(bloque, "Suplentes", False)
        for tipo, nombre in tarjetas_de(bloque):
            for j in jugadores:
                if normalizar_nombre(j["nombre"]) == nombre:
                    j["tarjeta_amarilla" if tipo == "amarilla" else "tarjeta_roja"] += 1
        equipos.append({"nombre": limpiar(numero.get_text()), "jugadores": jugadores, "goles": 0})

    if len(equipos) != 2:
        raise RuntimeError("El acta no tiene el formato esperado (no aparecen los dos equipos).")
    local, visitante = equipos

    # Cada gol se asigna al equipo del jugador; uno en propia puerta suma al
    # rival y no cuenta como gol del jugador.
    for gol in goles_del_partido(soup):
        nombre = normalizar_nombre(gol["nombre"])
        for equipo, rival in ((local, visitante), (visitante, local)):
            jugador = next((j for j in equipo["jugadores"] if normalizar_nombre(j["nombre"]) == nombre), None)
            if not jugador:
                continue
            if gol["tipo"] == "propia":
                rival["goles"] += 1
            else:
                equipo["goles"] += 1
                jugador["goles"] += 1
            break

    return {
        "local": local,
        "visitante": visitante,
        "resultado": f"{local['goles']}-{visitante['goles']}",
    }


def main(argv):
    try:
        cookie = ""
        if len(argv) == 3 and argv[1] == "--html":
            with open(argv[2], encoding="utf-8") as f:
                html = f.read()
        elif len(argv) == 3:
            html, cookie = descargar_acta(argv[1], argv[2])
        else:
            raise RuntimeError("Uso: rfaf_acta.py <cod_primaria> <cod_acta> | --html <fichero>")
        print(json.dumps({**parsear_acta(html), "cookie": cookie}, ensure_ascii=False))
        return 0
    except Exception as e:  # noqa: BLE001 - cualquier fallo se devuelve como JSON
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
