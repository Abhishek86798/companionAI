
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** backend
- **Date:** 2026-05-15
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 get health check endpoint returns ok status
- **Test Code:** [TC001_get_health_check_endpoint_returns_ok_status.py](./TC001_get_health_check_endpoint_returns_ok_status.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8367bde4-929f-4924-8008-d80bdab3ff46/78f32a57-5db9-4323-bb13-3568ec983f01
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 post message endpoint streams ai response for anonymous user
- **Test Code:** [TC002_post_message_endpoint_streams_ai_response_for_anonymous_user.py](./TC002_post_message_endpoint_streams_ai_response_for_anonymous_user.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 45, in <module>
  File "<string>", line 43, in test_post_message_anonymous_stream
AssertionError: No done event ('[DONE]') found in streamed response.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8367bde4-929f-4924-8008-d80bdab3ff46/78c3cec8-d1d9-4edb-be38-117346a9895a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 post message endpoint enforces rate limit and safety checks for authenticated user
- **Test Code:** [TC003_post_message_endpoint_enforces_rate_limit_and_safety_checks_for_authenticated_user.py](./TC003_post_message_endpoint_enforces_rate_limit_and_safety_checks_for_authenticated_user.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8367bde4-929f-4924-8008-d80bdab3ff46/0430dcad-2601-4b9f-a332-733c98c2c87e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 post message endpoint handles crisis content with crisis response
- **Test Code:** [TC004_post_message_endpoint_handles_crisis_content_with_crisis_response.py](./TC004_post_message_endpoint_handles_crisis_content_with_crisis_response.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8367bde4-929f-4924-8008-d80bdab3ff46/1efd0ed7-6231-4687-affb-b03248bc8190
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 post message endpoint returns 429 when daily quota exceeded
- **Test Code:** [TC005_post_message_endpoint_returns_429_when_daily_quota_exceeded.py](./TC005_post_message_endpoint_returns_429_when_daily_quota_exceeded.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 22, in <module>
  File "<string>", line 18, in test_post_message_rate_limit_exceeded
AssertionError: Expected status code 429, got 200

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8367bde4-929f-4924-8008-d80bdab3ff46/596a5d2a-60d2-4172-8e8b-861c9cfb23e7
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 get messages endpoint returns paginated conversation history for authenticated user
- **Test Code:** [TC006_get_messages_endpoint_returns_paginated_conversation_history_for_authenticated_user.py](./TC006_get_messages_endpoint_returns_paginated_conversation_history_for_authenticated_user.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 53, in <module>
  File "<string>", line 35, in test_get_messages_endpoint_returns_paginated_conversation_history_for_authenticated_user
AssertionError: Failed to create owned conversation, cannot test messages GET endpoint.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8367bde4-929f-4924-8008-d80bdab3ff46/7e86d359-9359-4275-820f-336312e9c125
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 get messages endpoint returns 401 for missing or invalid jwt
- **Test Code:** [TC007_get_messages_endpoint_returns_401_for_missing_or_invalid_jwt.py](./TC007_get_messages_endpoint_returns_401_for_missing_or_invalid_jwt.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 44, in <module>
  File "<string>", line 39, in test_get_messages_unauthorized_returns_401
AssertionError: Response body does not indicate authentication required

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8367bde4-929f-4924-8008-d80bdab3ff46/9d677465-f2f0-4181-9269-02e6717cd7ab
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 get memories endpoint returns all memory facts for authenticated user
- **Test Code:** [TC008_get_memories_endpoint_returns_all_memory_facts_for_authenticated_user.py](./TC008_get_memories_endpoint_returns_all_memory_facts_for_authenticated_user.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 14, in test_get_memories_returns_all_memory_facts_for_authenticated_user
  File "/var/lang/lib/python3.12/site-packages/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: http://localhost:8000/api/v1/memories

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 60, in <module>
  File "<string>", line 16, in test_get_memories_returns_all_memory_facts_for_authenticated_user
AssertionError: Request to GET /api/v1/memories failed: 401 Client Error: Unauthorized for url: http://localhost:8000/api/v1/memories

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8367bde4-929f-4924-8008-d80bdab3ff46/c035c2c3-9ab3-4c16-aed3-9cd8af4f2e60
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 delete memories endpoint deletes owned memory fact
- **Test Code:** [TC009_delete_memories_endpoint_deletes_owned_memory_fact.py](./TC009_delete_memories_endpoint_deletes_owned_memory_fact.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 128, in <module>
  File "<string>", line 27, in test_delete_memories_endpoint_deletes_owned_memory_fact
AssertionError: Failed to send message: {"detail":"Invalid or expired token"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8367bde4-929f-4924-8008-d80bdab3ff46/6a8b2b4e-7b7a-445c-b784-f83ea2f08c75
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 get persona endpoint returns default persona when none exists
- **Test Code:** [TC010_get_persona_endpoint_returns_default_persona_when_none_exists.py](./TC010_get_persona_endpoint_returns_default_persona_when_none_exists.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/8367bde4-929f-4924-8008-d80bdab3ff46/0a71a8f0-2389-4eca-bf25-5f6026befb15
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **40.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---