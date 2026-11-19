use serde_json::Value;
use std::{env, error::Error, fs};

pub fn acceptance_case(case_id: &str) -> Result<Value, Box<dyn Error>> {
    let source = fs::read_to_string(env::var("FEATURE_CASES_PATH")?)?;
    let cases: Vec<Value> = serde_json::from_str(&source)?;
    cases
        .into_iter()
        .find(|scenario| scenario["caseId"] == case_id)
        .ok_or_else(|| format!("acceptance feature case {case_id} was not found").into())
}
