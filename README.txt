# 🐘 PostgreSQL Commands

This section lists useful PostgreSQL commands for managing your **event management database**.

---

## 1. Delete Rows by User ID
Delete one or more users’ events from the `event_plans` table.

```sql
DELETE FROM event_plans
WHERE user_id IN (35, 36, 37);