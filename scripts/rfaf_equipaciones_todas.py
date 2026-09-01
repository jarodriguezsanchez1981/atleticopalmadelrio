#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Extractor de equipaciones RFAF - todas las ligas de Córdoba (temporada 2025/2026).
Recorre las competiciones indicadas, sus grupos y extrae Equipo / Camiseta /
Calzona(Pantalón) / Medias de cada club.

Uso:
    python rfaf_equipaciones_todas.py
Salidas:
    RFAF_Cordoba_Equipaciones.xlsx
    RFAF_Cordoba_Equipaciones.json
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from urllib.parse import urlencode

import pandas as pd
import requests
from bs4 import BeautifulSoup

BASE = "https://www.rfaf.es"
TEMPORADA = 21

# id -> nombre de competición (ligas de Córdoba)
COMPETICIONES = {
    44788627: "1ª Andaluza Senior (Cordoba)",
    44788628: "2ª Andaluza Senior (Cordoba)",
    44788631: "2ª Andaluza Juvenil (Cordoba)",
    44788635: "2ª Andaluza Cadete (Cordoba)",
    44788646: "2ª Andaluza Infantil (Cordoba)",
    44788654: "2ª Andaluza Alevin (Cordoba)",
    44788661: "2ª Andaluza Benjamin (Cordoba)",
    46510086: "2ª Andaluza Prebenjamin (Cordoba)",
    45339232: "3ª Andaluza Senior (Cordoba)",
    44788633: "3ª Andaluza Juvenil (Cordoba)",
    44788637: "3ª Andaluza Cadete (Cordoba)",
    44788652: "3ª Andaluza Infantil (Cordoba)",
    44788752: "3ª Andaluza Alevin (Cordoba)",
    44788749: "3ª Andaluza Benjamin (Cordoba)",
    45447069: "4ª Andaluza Juvenil (Cordoba)",
    45697974: "4ª Andaluza Cadete (Cordoba)",
    45698929: "4ª Andaluza Infantil (Cordoba)",
    45983595: "4ª Andaluza Alevin (Cordoba)",
    46357433: "4ª Andaluza Benjamin (Cordoba)",
    45030612: "División Honor Sénior",
}

OUT_XLSX = Path("RFAF_Cordoba_Equipaciones.xlsx")
OUT_JSON = Path("RFAF_Cordoba_Equipaciones.json")

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


def url_directorio(cod_competicion: int, cod_grupo: int) -> str:
    params = {
        "Buscar": "1",
        "Sch_CodCompeticion": cod_competicion,
        "Sch_CodGrupo": cod_grupo,
        "Sch_Cod_Temporada": TEMPORADA,
        "Sch_Tipo_Juego": "",
        "cod_primaria": "1000117",
    }
    return BASE + "/pnfg/NPcd/NFG_LstDirectorioEquipos?" + urlencode(params)


def limpiar(txt: str) -> str:
    return re.sub(r"\s+", " ", txt or "").strip()


def parece_login(soup: BeautifulSoup, html: str) -> bool:
    texto = limpiar(soup.get_text(" ", strip=True)).lower()
    return (
        "/nlogin" in html.lower()
        or "iniciar sesión" in texto
        or ("login" in texto and len(texto) < 1000)
        or len(texto) < 100
    )


def obtener_grupos(session: requests.Session, cod_competicion: int) -> list[tuple[str, str]]:
    url = (
        f"{BASE}/pnfg/NPcd/NFG_LstDirectorioEquipos_Exe"
        f"?cod_primaria=1000117&Sch_CodCompeticion={cod_competicion}&Sch_Codigo_Delegacion="
    )
    r = session.get(url, timeout=30)
    m = re.search(r"var Grupos=new Array\((.*?)\);", r.text, re.S)
    if not m:
        return []
    valores = re.findall(r'"([^"]*)"', m.group(1))
    # pares (value, label) desde el índice 2
    return [(valores[i], valores[i + 1]) for i in range(2, len(valores) - 1, 2)]


def extraer_equipos(html: str, competicion: str, grupo: str) -> list[dict]:
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
            "Competición": competicion,
            "Grupo": grupo,
            "Equipo": nombre,
            "Camiseta": camiseta,
            "Calzona/Pantalón": calzonas,
            "Medias": medias,
        })

    return resultados


def main():
    session = crear_sesion()
    todos = []

    for cod_comp, nombre_comp in COMPETICIONES.items():
        print(f"\n=== {nombre_comp} ({cod_comp}) ===")
        try:
            grupos = obtener_grupos(session, cod_comp)
        except requests.RequestException as e:
            print(f"  ERROR grupos: {e}")
            continue

        print(f"  Grupos: {len(grupos)}")
        for cod_grupo, nom_grupo in grupos:
            url = url_directorio(cod_comp, cod_grupo)
            print(f"  [{nom_grupo}] {url}")
            try:
                r = session.get(url, timeout=30, allow_redirects=True)
                soup = BeautifulSoup(r.text, "html.parser")
                if parece_login(soup, r.text):
                    print("    AVISO: login/página vacía, se omite.")
                    continue
                datos = extraer_equipos(r.text, nombre_comp, nom_grupo)
                print(f"    + {len(datos)} equipos")
                todos.extend(datos)
            except requests.RequestException as e:
                print(f"    ERROR HTTP: {e}")

            time.sleep(0.6)

    # Deduplicar por equipo (la equipación del club no cambia entre ligas)
    mapa = {}
    for r in todos:
        clave = limpiar(r["Equipo"]).upper()
        if clave not in mapa:
            mapa[clave] = r

    final = list(mapa.values())

    df = pd.DataFrame(final, columns=["Competición", "Grupo", "Equipo", "Camiseta", "Calzona/Pantalón", "Medias"])
    df = df.sort_values("Equipo")

    with pd.ExcelWriter(OUT_XLSX, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Equipaciones", index=False)

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)

    print(f"\nTotal registros únicos: {len(final)}")
    print(f"Excel: {OUT_XLSX.resolve()}")
    print(f"JSON: {OUT_JSON.resolve()}")


if __name__ == "__main__":
    main()
