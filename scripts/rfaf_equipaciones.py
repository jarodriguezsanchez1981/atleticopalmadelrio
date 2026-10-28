#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Extractor de equipaciones RFAF
3ª Andaluza Alevín (Córdoba) - temporada 2025/2026

Obtiene, cuando RFAF las expone en HTML:
    - Equipo
    - Camiseta
    - Calzona/Pantalón
    - Medias
    - Grupo

NO utiliza Selenium ni Playwright y no intenta saltarse un muro de cookies.
Trabaja con las páginas públicas antiguas /pnfg de RFAF.

Instalación:
    pip install requests beautifulsoup4 pandas openpyxl

Ejecución:
    python rfaf_equipaciones.py

Si RFAF devuelve NLogin o una página vacía, el script guarda la respuesta
para poder diagnosticarla.
"""

from __future__ import annotations

import re
import time
from pathlib import Path
from urllib.parse import urlencode

import pandas as pd
import requests
from bs4 import BeautifulSoup


BASE = "https://www.rfaf.es"
TEMPORADA = 21

# 3ª Andaluza Alevin (Cordoba), 2025-2026
COMPETICION = 44788752
GRUPOS = {
    "Grupo I": 44788753,
    "Grupo II": 44788754,
}

OUT = Path("3_Andaluza_Alevin_Cordoba_Equipaciones.xlsx")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/151.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}


def crear_sesion() -> requests.Session:
    s = requests.Session()
    s.headers.update(HEADERS)
    return s


def url_directorio(cod_grupo: int) -> str:
    params = {
        "Buscar": "1",
        "Sch_CodCompeticion": COMPETICION,
        "Sch_CodGrupo": cod_grupo,
        "Sch_Cod_Temporada": TEMPORADA,
        "Sch_Tipo_Juego": "",
        "cod_primaria": "1000117",
    }
    return BASE + "/pnfg/NPcd/NFG_LstDirectorioEquipos?" + urlencode(params)


def limpiar(txt: str) -> str:
    return re.sub(r"\s+", " ", txt or "").strip()


def extraer_imagenes_y_texto(soup: BeautifulSoup) -> list[str]:
    """
    El directorio RFAF suele representar camiseta/pantalón/medias como
    imágenes con alt/title. Recuperamos ambos para que el extractor sea
    resistente a cambios menores de HTML.
    """
    valores = []

    for img in soup.find_all("img"):
        for attr in ("alt", "title"):
            valor = limpiar(img.get(attr, ""))
            if valor and valor.lower() not in {"image", "imagen"}:
                valores.append(valor)

    return valores


def parece_login(soup: BeautifulSoup, html: str) -> bool:
    texto = limpiar(soup.get_text(" ", strip=True)).lower()
    return (
        "/nlogin" in html.lower()
        or "iniciar sesión" in texto
        or "login" in texto and len(texto) < 1000
        or len(texto) < 100
    )


def extraer_equipos(html: str, grupo: str) -> list[dict]:
    """
    Cada equipo es una tarjeta `div.card`:
      - <a class="more" href="...codequipo=..."> NOMBRE DEL CLUB </a>
      - <h5>...<img src="...equipo_camiseta.png"...> Amarillo</h5>
      - <h5>...<img src="...equipo_pantalon.png"...> Verde</h5>
      - <h5>...<img src="...equipo_medias.png"...> Verdes</h5>
    """
    soup = BeautifulSoup(html, "html.parser")
    resultados = []

    for card in soup.select("div.card"):
        enlace = card.select_one("a.more")
        if not enlace:
            continue
        nombre = limpiar(enlace.get_text(" ", strip=True))
        if not nombre:
            continue

        camiseta = calzonas = medias = ""
        for h5 in card.find_all("h5"):
            img = h5.find("img")
            src = img.get("src", "") if img else ""
            texto = limpiar(h5.get_text(" ", strip=True))
            if "equipo_camiseta" in src:
                camiseta = texto
            elif "equipo_pantalon" in src:
                calzonas = texto
            elif "equipo_medias" in src:
                medias = texto

        resultados.append({
            "Grupo": grupo,
            "Equipo": nombre,
            "Camiseta": camiseta,
            "Calzona/Pantalón": calzonas,
            "Medias": medias,
        })

    # Eliminar duplicados conservando orden
    unicos = []
    vistos = set()
    for r in resultados:
        clave = (
            r.get("Grupo", ""),
            limpiar(r.get("Equipo", "")).upper(),
            limpiar(r.get("Camiseta", "")).upper(),
            limpiar(r.get("Calzona/Pantalón", "")).upper(),
            limpiar(r.get("Medias", "")).upper(),
        )
        if clave not in vistos:
            vistos.add(clave)
            unicos.append(r)

    return unicos


def descargar_grupo(session: requests.Session, grupo: str, cod_grupo: int):
    url = url_directorio(cod_grupo)
    print(f"\n[{grupo}]")
    print(url)

    r = session.get(url, timeout=30, allow_redirects=True)
    print(f"HTTP {r.status_code} -> {r.url}")

    # Guardamos HTML siempre: sirve para diagnosticar cambios de RFAF.
    debug = Path(f"debug_{cod_grupo}.html")
    debug.write_text(r.text, encoding="utf-8", errors="ignore")

    soup = BeautifulSoup(r.text, "html.parser")

    if parece_login(soup, r.text):
        print("  AVISO: RFAF ha devuelto login/página vacía.")
        print(f"  HTML guardado en: {debug}")
        return []

    datos = extraer_equipos(r.text, grupo)
    print(f"  Registros extraídos: {len(datos)}")
    return datos


def guardar_excel(datos: list[dict]):
    columnas = [
        "Grupo",
        "Equipo",
        "Camiseta",
        "Calzona/Pantalón",
        "Medias",
    ]

    df = pd.DataFrame(datos, columns=columnas)

    if not df.empty:
        df = df.drop_duplicates()
        df = df.sort_values(["Grupo", "Equipo"], na_position="last")

    with pd.ExcelWriter(OUT, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Equipaciones", index=False)

        # Hoja con las URLs consultadas
        urls = pd.DataFrame([
            {
                "Grupo": grupo,
                "URL": url_directorio(cod_grupo),
            }
            for grupo, cod_grupo in GRUPOS.items()
        ])
        urls.to_excel(writer, sheet_name="Fuentes", index=False)

        # Hoja de diagnóstico
        resumen = pd.DataFrame([
            {"Dato": "Competición", "Valor": "3ª Andaluza Alevin (Cordoba)"},
            {"Dato": "Temporada", "Valor": "2025-2026"},
            {"Dato": "Competición ID", "Valor": COMPETICION},
            {"Dato": "Registros", "Valor": len(df)},
        ])
        resumen.to_excel(writer, sheet_name="Resumen", index=False)

    print(f"\nExcel creado: {OUT.resolve()}")


def main():
    session = crear_sesion()

    todos = []

    for grupo, cod_grupo in GRUPOS.items():
        try:
            todos.extend(descargar_grupo(session, grupo, cod_grupo))
        except requests.RequestException as e:
            print(f"  ERROR HTTP: {e}")
        except Exception as e:
            print(f"  ERROR: {type(e).__name__}: {e}")

        time.sleep(1)

    guardar_excel(todos)

    if not todos:
        print(
            "\nNo se han obtenido registros. Si los debug_*.html contienen "
            "NLogin o HTML vacío, RFAF está exigiendo sesión/cookies para "
            "esa petición desde tu entorno. En ese caso no conviene intentar "
            "saltarse el control: usa el HTML/PDF público que RFAF entregue "
            "en navegador o exporta desde el directorio y procesa ese archivo."
        )


if __name__ == "__main__":
    main()
