package contract

import (
	"encoding/json"
	"os"
	"testing"
)

func acceptanceCase(t *testing.T, caseID string) map[string]any {
	t.Helper()
	contents, err := os.ReadFile(os.Getenv("FEATURE_CASES_PATH"))
	if err != nil {
		t.Fatal(err)
	}
	var cases []map[string]any
	if err := json.Unmarshal(contents, &cases); err != nil {
		t.Fatal(err)
	}
	for _, scenario := range cases {
		if scenario["caseId"] == caseID {
			return scenario
		}
	}
	t.Fatalf("acceptance feature case %q was not found", caseID)
	return nil
}
