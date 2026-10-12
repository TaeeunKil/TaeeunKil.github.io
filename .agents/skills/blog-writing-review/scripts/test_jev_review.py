import contextlib
import copy
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import jev_review as review


class ComparisonTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = {"audience": "개발자", "purpose": "조건 보존", "original": "원문",
                     "revision": "수정안", "required_facts": ["조건"], "source_excerpts": ["근거"]}
        review.write(self.root / "input.json", self.data)
        self.run = self.root / "run"
        with contextlib.redirect_stdout(io.StringIO()):
            review.prepare(self.root / "input.json", self.run, "jev-latest")

    def responses(self, first="B", second="A", preservation=None):
        manifest = review.verify(self.run)
        for name, choice in (("forward", first), ("reverse", second)):
            answers = {axis: {"type": "choice", "choice": choice} for axis in review.AXES}
            if preservation:
                answers["information_preservation"]["choice"] = preservation
            review.write(self.run / f"{name}-response.json", {"request_sha256": manifest["requests"][name],
                "response": {"answers": answers, "model": "test-model", "usage": {}}})
        facts = self.root / "facts.json"
        review.write(facts, {"input_sha256": manifest["input_sha256"], "candidates": {
            "revision": {"status": "pass", "evidence": "조건을 근거와 대조함"}}})
        return facts

    def result(self, facts=None):
        with contextlib.redirect_stdout(io.StringIO()):
            return review.report(self.run, facts)

    def test_swap_maps_to_same_revision(self):
        self.assertEqual(self.result(self.responses())["recommendation"], "revision")

    def test_position_bias_holds(self):
        self.assertEqual(self.result(self.responses("A", "A"))["status"], "hold")

    def test_missing_fact_review_holds(self):
        self.responses()
        self.assertEqual(self.result()["status"], "hold")

    def test_insufficient_holds(self):
        self.assertEqual(self.result(self.responses("insufficient", "insufficient"))["status"], "hold")

    def test_preservation_conflict_holds(self):
        self.assertEqual(self.result(self.responses(preservation="A"))["status"], "hold")

    def test_changed_input_rejected(self):
        data = copy.deepcopy(self.data)
        data["revision"] = "changed"
        (self.run / "input.json").write_text(__import__("json").dumps(data), encoding="utf-8")
        with self.assertRaises(ValueError):
            review.verify(self.run)

    def test_missing_key_never_calls_api(self):
        with patch.object(review, "get_key", side_effect=ValueError("missing")), patch.object(review, "call") as api:
            with self.assertRaises(ValueError):
                review.run(self.run)
            api.assert_not_called()

    def test_failure_not_retried(self):
        with patch.object(review, "get_key", return_value="test-only"), patch.object(review, "call", side_effect=ValueError("failure")) as api:
            for _ in range(2):
                with self.assertRaises(ValueError):
                    review.run(self.run)
            self.assertEqual(api.call_count, 1)

    def test_invalid_answer_rejected(self):
        with self.assertRaises(ValueError):
            review.validate_response({"answers": {}})


if __name__ == "__main__":
    unittest.main()
