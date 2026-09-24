"""
Tests for the headless calculator CLI (engine/cli.py → gradewise-calc).
Runs main() directly with argv lists — no subprocesses.
"""

import json
from pathlib import Path

import pytest

from engine import cli


class TestLoadGrades:
    def test_loads_real_dataset(self):
        grades = cli.load_grades()
        assert len(grades) == 17
        # every record satisfies the engine schema (load_grades validates)
        assert grades[0]["grade"] == "201"

    def test_missing_file_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            cli.load_grades(tmp_path / "nope.json")

    def test_empty_list_raises(self, tmp_path):
        p = tmp_path / "g.json"
        p.write_text("[]")
        with pytest.raises(ValueError, match="non-empty"):
            cli.load_grades(p)


class TestFindGradeByLabel:
    def test_exact(self):
        assert cli._find_grade_by_label(cli.load_grades(), "304")["grade"] == "304"

    def test_normalised(self):
        # case + brackets + dash + space all stripped
        for label in ("2205 (Duplex)", "2205(Duplex)", "2205 - duplex", " 2205 DUPLEX "):
            g = cli._find_grade_by_label(cli.load_grades(), label)
            assert g is not None and g["grade"] == "2205 (Duplex)"

    def test_unknown(self):
        assert cli._find_grade_by_label(cli.load_grades(), "Titanium-9000") is None


class TestCLI:
    def test_human_output_round(self, capsys):
        rc = cli.main(["--grade", "304", "--dimension", "20", "--length", "1200"])
        out = capsys.readouterr().out
        assert rc == 0
        assert "Grade: 304" in out
        assert "314.1593 mm^2" in out          # round area
        assert "6885.24 kg" in out             # round yield load
        assert "57.38 kg" in out               # round bending load
        assert "3.016 kg" in out               # rod self-mass

    def test_square_output_differs(self, capsys):
        cli.main(["--grade", "304", "--shape", "square", "--dimension", "20", "--length", "1200"])
        out = capsys.readouterr().out
        assert "400.0 mm^2" in out             # square area = d²
        assert "8766.56 kg" in out             # square yield load
        assert "97.41 kg" in out               # square bending load
        assert "3.84 kg" in out                # square self-mass

    def test_json_output_shape(self, capsys):
        rc = cli.main(["--grade", "316", "--shape", "square", "--dimension", "25", "--length", "1500", "--json"])
        assert rc == 0
        data = json.loads(capsys.readouterr().out)
        assert data["shape"] == "square"
        assert data["dimension_mm"] == 25.0
        assert data["length_mm"] == 1500.0
        assert data["tensile"]["cross_section_area_mm2"] == 625.0
        assert data["bending"]["section_modulus_mm3"] == 2604.1667
        assert data["rod_mass_kg"] > 0

    def test_diameter_alias_flag(self, capsys):
        rc = cli.main(["--grade", "304", "--diameter", "20"])
        assert rc == 0
        out = capsys.readouterr().out
        assert "57.38 kg" in out

    def test_list_grades(self, capsys):
        rc = cli.main(["--list-grades"])
        out = capsys.readouterr().out
        assert rc == 0
        lines = [ln for ln in out.splitlines() if ln.strip()]
        assert len(lines) == 17
        assert "2205 (Duplex)" in lines

    def test_missing_grade_flag_exits(self, capsys):
        with pytest.raises(SystemExit):
            cli.main([])

    def test_unknown_grade_exits_2(self, capsys):
        rc = cli.main(["--grade", "Titanium-9000", "--dimension", "20"])
        err = capsys.readouterr().err
        assert rc == 2
        assert "unknown grade" in err

    def test_non_positive_dimension_exits_2(self, capsys):
        rc = cli.main(["--grade", "304", "--dimension", "-5"])
        assert rc == 2
        assert "positive" in capsys.readouterr().err

    def test_missing_grades_file_exits_1(self, monkeypatch, capsys):
        monkeypatch.setattr(cli, "_REPO_GRADES_PATH", Path("/nonexistent/grades.json"))
        monkeypatch.setattr(cli, "_PACKAGED_GRADES_PATH", Path("/nonexistent/grades.json"))
        rc = cli.main(["--grade", "304"])
        assert rc == 1
        assert "error:" in capsys.readouterr().err

    def test_duplex_grade_with_spaces(self, capsys):
        """Multi-word label must survive shell quoting via argv list."""
        rc = cli.main(["--grade", "2205 (Duplex)", "--shape", "square", "--dimension", "32", "--length", "2000"])
        assert rc == 0
        out = capsys.readouterr().out
        assert "Grade: 2205 (Duplex)" in out
        assert "1024.0 mm^2" in out

    def test_parser_has_sensible_defaults(self):
        parser = cli.build_parser()
        ns = parser.parse_args(["--grade", "304"])
        assert ns.shape == "round"
        assert ns.dimension == 20.0
        assert ns.length == 1200.0
        assert ns.json is False