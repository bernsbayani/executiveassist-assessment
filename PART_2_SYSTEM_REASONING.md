# Part 2: Reasoning about a distributed system

## 1. Failure Modes (Under-counts and Over-counts)

**Under-count Failure Modes:**
An intermittent under-count in a queue-based system often points to issues where messages are dropped, delayed, or fail to process completely. Plausible causes include:
*   **Consumer Lag:** The worker process handling the incoming response events is underscaled or experiencing slow database insertion times. By the time the nightly report runs, the events are still sitting in the queue waiting to be processed, creating an artificial under-count (eventual consistency).
*   **Poison Messages & Dead-Letter Queues (DLQ):** The downstream provider might occasionally send malformed response payloads. The tracking process fails to parse the message, throws an exception, and rather than crashing the worker, the message is routed to a Dead-Letter Queue. Since the report queries the main data store, these DLQ messages are missing from the count.
*   **Silent Queue Eviction:** If the Redis queue is not properly configured with persistence and hits memory limits during high-volume batches, it might silently evict jobs before they are processed.

**Over-count Failure Mode:**
*   **Redelivery and Lack of Idempotency:** A worker process pulls a response event from the queue and successfully writes it to the data store, but crashes or times out *before* acknowledging the job back to the queue. The queue's visibility timeout expires, making the job available again. Another worker picks it up and processes it. If the data store insertion is not idempotent (e.g., it doesn't check if the specific event ID already exists before inserting), a duplicate record is created, resulting in an over-count.

## 2. Tracing a Single Logical Operation

To trace a single message and its subsequent response through this pipeline, I would rely on a unique **Correlation ID** (or Message ID) generated at the API level and passed through every stage. I would investigate in this specific order:

1.  **API Logs:** Search for the initial batch payload using the Correlation ID to verify the API successfully received the request and pushed it to the queue.
2.  **Send Queue Metrics/Logs:** Verify the job containing the Correlation ID was registered in the Redis/BullMQ send queue.
3.  **Worker Logs:** Search the worker application logs for the Correlation ID to confirm the worker pulled the job, initiated the API call to the downstream provider, and logged a successful HTTP 200 response from that provider.
4.  **Tracking Process Logs (Ingress):** Check the logs of the separate tracking process to see if the asynchronous webhook/response event actually arrived from the downstream provider carrying that same Correlation ID.
5.  **Dead-Letter Queue (DLQ):** If the tracking process received the event but it never made it to the database, I would inspect the contents of the DLQ to see if the job failed due to a validation error or database timeout.
6.  **Data Store State:** Finally, query the data store directly `SELECT * FROM response_events WHERE correlation_id = '...'` to verify the exact timestamp of insertion and the current state of the record.

## 3. Genuine Defect vs. Eventual Consistency

In an asynchronous, event-driven system, intermittent reporting gaps are often just symptoms of normal consumer lag—the data isn't missing; it just hasn't arrived *yet*. 

To move my assessment from "looks wrong" to "is a genuine defect," I would look for the following specific evidence:

*   **Time-boxing the Gap:** If the under-count is purely due to eventual consistency, querying the data store for that same batch 12 or 24 hours later should show that the gap has closed as the workers caught up. If 48 hours pass, the queue depth is zero, and the data store is still short, it is definitively a defect (data loss).
*   **DLQ Spikes:** If I correlate the dates of the nightly report under-counts with our queue metrics and see a proportional spike in messages routed to the DLQ on those specific nights, it is a defect. The system is actively rejecting data.
*   **Downstream Reconciliation:** If we cross-reference our internal data store with the downstream provider's analytics dashboard (e.g., they report 50,000 delivered events, but our database only holds 48,000, and our queues are completely empty), that is concrete evidence of a dropped message defect within our tracking pipeline.