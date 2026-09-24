"""
Tests for convert_grades.py — builds synthetic .xlsx workbooks in tmp_path
and verifies the JSON produced, including degradation behaviour for dirty
cells and CLI error paths.
"""

import json

import openpyxl
import pytest

import convert_grades as cg


def build_workbook(path, headers, rows):
    wb = openpyxl.Workbook()
    ws = wb.active
    assert ws is not None
    ws.title = "Grade Data"
    ws.append(headers)
    for row in rows:
        ws.append(row)
    wb.save(path)
    return path


GOOD_HEADERS = [
    "Grade", "UNS No.", "Yield Strength (MPa)", "Tensile Strength (MPa)",
    "Elongation (%)", "Young's Modulus (GPa)", "Density (kg/m3)",
    "Corrosion Resistance (1-5)", "Max Service Temp (C)", "Formability (1-5)",
    "Relative Cost Tier (1-5)", "Weldability", "Magnetic", "Type",
    "Typical Applications", "Trade-off Notes",
]


class TestConvert:
    def test_basic_roundtrip(self, tmp_path):
        xlsx = build_workbook(tmp_path / "g.xlsx", GOOD_HEADERS, [
            ["304", "S30400", 215, 505, 40, 193, 8000, 3, 400, 4, 2, "Good", "No", "Austenitic", "Gate rails", "Solid choice"],
            ["316", "S31600", 205, 515, 40, 193, 8000, 4, 400, 4, 3, "Good", "No", "Austenitic", "Coastal", "Marine"],
        ])
        out = tmp_path / "grades.json"
        grades = cg.convert(str(xlsx), str(out))

        assert len(grades) == 2
        first = grades[0]
        assert first["grade"] == "304"
        assert first["yield_strength_mpa"] == 215          # int stays int
        assert first["density_kg_m3"] == 8000
        assert first["weldability"] == "Good"
        # JSON written matches what was returned
        assert json.loads(out.read_text()) == grades

    def test_numeric_float_preserved(self, tmp_path):
        xlsx = build_workbook(tmp_path / "g.xlsx", GOOD_HEADERS, [
            ["X", "S00000", 210.5, 500.25, 40.5, 193.0, 7900.5, 2, 350, 3, 2, "Fair", "Yes", "Type", "App", "Notes"],
        ])
        grades = cg.convert(str(xlsx), str(tmp_path / "o.json"))
        assert grades[0]["yield_strength_mpa"] == 210.5
        assert grades[0]["density_kg_m3"] == 7900.5

    def test_empty_rows_skipped(self, tmp_path):
        xlsx = build_workbook(tmp_path / "g.xlsx", GOOD_HEADERS, [
            ["304", "S30400", 215, 505, 40, 193, 8000, 3, 400, 4, 2, "Good", "No", "Austenitic", "App", "Notes"],
            [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None],
            ["409", "S40900", 170, 380, 20, 200, 7700, 2, 350, 3, 1, "Good", "Yes", "Ferritic", "Exhaust", "Cheap"],
        ])
        grades = cg.convert(str(xlsx), str(tmp_path / "o.json"))
        assert [g["grade"] for g in grades] == ["304", "409"]

    def test_missing_numeric_becomes_zero(self, tmp_path):
        xlsx = build_workbook(tmp_path / "g.xlsx", GOOD_HEADERS, [
            ["304", "S30400", None, 505, 40, 193, 8000, 3, 400, 4, 2, "Good", "No", "Austenitic", "App", "Notes"],
        ])
        grades = cg.convert(str(xlsx), str(tmp_path / "o.json"))
        assert grades[0]["yield_strength_mpa"] == 0

    def test_non_numeric_numeric_cell_warns_and_degrades(self, tmp_path, capsys):
        # A dirty cell used to abort the whole conversion with ValueError.
        xlsx = build_workbook(tmp_path / "g.xlsx", GOOD_HEADERS, [
            ["304", "S30400", "high-strength", 505, 40, 193, 8000, 3, 400, 4, 2, "Good", "No", "Austenitic", "App", "Notes"],
            ["316", "S31600", 205, 515, 40, 193, 8000, 4, 400, 4, 3, "Good", "No", "Austenitic", "App", "Notes"],
        ])
        grades = cg.convert(str(xlsx), str(tmp_path / "o.json"))
        assert len(grades) == 2
        assert grades[0]["yield_strength_mpa"] == 0
        assert "not numeric" in capsys.readouterr().out

    def test_unmapped_headers_warn(self, tmp_path, capsys):
        headers = GOOD_HEADERS + ["Mystery Column"]
        xlsx = build_workbook(tmp_path / "g.xlsx", headers, [
            ["304", "S30400", 215, 505, 40, 193, 8000, 3, 400, 4, 2, "Good", "No", "Austenitic", "App", "Notes", "x"],
        ])
        grades = cg.convert(str(xlsx), str(tmp_path / "o.json"))
        assert len(grades) == 1
        assert "Unmapped headers" in capsys.readouterr().out
        assert "Mystery Column" not in grades[0]

    def test_series_and_grade_coerced_to_str(self, tmp_path):
        headers = GOOD_HEADERS
        xlsx = build_workbook(tmp_path / "g.xlsx", headers, [
            [300, "S30000", 215, 505, 40, 193, 8000, 3, 400, 4, 2, "Good", "No", "Austenitic", "App", "Notes"],
        ])
        # note: no Series column in our header subset — grade only
        grades = cg.convert(str(xlsx), str(tmp_path / "o.json"))
        assert grades[0]["grade"] == "300"

    def test_missing_file_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            cg.convert(str(tmp_path / "nope.xlsx"), str(tmp_path / "o.json"))

    def test_clean_text_normalises_whitespace(self, tmp_path):
        headers = GOOD_HEADERS
        xlsx = build_workbook(tmp_path / "g.xlsx", headers, [
            ["304", "S30400", 215, 505, 40, 193, 8000, 3, 400, 4, 2, "Good", "No", "Austenitic", "  Gate  rails,  hinges  ", "  Solid   choice  "],
        ])
        grades = cg.convert(str(xlsx), str(tmp_path / "o.json"))
        assert grades[0]["typical_applications"] == "Gate rails, hinges"
        assert grades[0]["trade_off_notes"] == "Solid choice"


class TestCLI:
    def test_missing_excel_exits_1(self, tmp_path, capsys):
        rc = cg.main(["--excel", str(tmp_path / "nope.xlsx"), "--output", str(tmp_path / "o.json")])
        assert rc == 1
        assert "error:" in capsys.readouterr().err

    def test_success_exits_0(self, tmp_path):
        xlsx = build_workbook(tmp_path / "g.xlsx", GOOD_HEADERS, [
            ["304", "S30400", 215, 505, 40, 193, 8000, 3, 400, 4, 2, "Good", "No", "Austenitic", "App", "Notes"],
        ])
        rc = cg.main(["--excel", str(xlsx), "--output", str(tmp_path / "o.json")])
        assert rc == 0
        assert (tmp_path / "o.json").exists()