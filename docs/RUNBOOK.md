# 🚒 Aegis Incident Response Runbook

> **Severity Levels**
> *   🔴 **SEV-1**: Data Loss, Privacy Leak, System Down
> *   🟡 **SEV-2**: Degraded Performance, Single Client Failure
> *   🟢 **SEV-3**: Minor Bug, Metrics Gap

---

## 1. Server Crash Loop (SEV-1)
**Symptom**: `aegis-server` container restarts continually.
**Trigger**: Prometheus `up` metric is 0.

### Diagnosis
1.  Check logs: `tail -f logs/server_*.log`
2.  Look for `OSError: Address already in use` (Port conflict) or `Corrupted Checkpoint`.

### Mitigation
*   **If Port Conflict**: Kill zombie process. `lsof -i :8080 | xargs kill -9`
*   **If Corrupted Checkpoint**:
    1.  Navigate to `checkpoints/`.
    2.  Move the latest `.npz` file to `checkpoints/corrupted/`.
    3.  Restart server. It will automatically rollback to the *previous* valid round.

---

## 2. Privacy Budget Exhaustion (SEV-2)
**Symptom**: Training stops. Logs show `PrivacyBudgetExceeded`.
**Trigger**: `fl_privacy_budget_consumed` > Threshold.

### Mitigation
1.  **Immediate**: Rotate the cohort. New users have fresh budget.
2.  **Long-term**: Increase `dp_sigma` (noise) or sub-sample rate in `strategy.py`.

---

## 3. High Latency (SEV-2)
**Symptom**: Rounds take > 5 minutes.
**Trigger**: `fl_round_duration_seconds` > 300.

### Diagnosis
1.  Check `fl_connected_clients`. If too many, stragglers are slowing aggregation.
2.  Check network IO.

### Mitigation
*   Decrease `min_fit_clients` in `server.py`.
*   Enable `timeout` in `strategy.py`.
