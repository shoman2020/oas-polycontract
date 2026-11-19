package nl.shiftleft;

import io.restassured.path.json.JsonPath;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

final class FeatureCases {
    private FeatureCases() {}

    static Map<String, Object> byId(String caseId) {
        String casesPath = System.getenv("FEATURE_CASES_PATH");
        if (casesPath == null || casesPath.isBlank()) {
            throw new IllegalStateException("FEATURE_CASES_PATH is required");
        }
        List<Map<String, Object>> cases = new JsonPath(Path.of(casesPath).toFile()).getList("$");
        return cases.stream()
            .filter(scenario -> caseId.equals(scenario.get("caseId")))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Acceptance feature case not found: " + caseId));
    }
}
