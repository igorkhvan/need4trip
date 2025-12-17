# Cron Schedule Options for Need4Trip

## Current Configuration

**Plan:** Hobby (Free)  
**Schedule:** `0 9 * * *` (Once daily at 9:00 AM)

---

## Vercel Plan Limits

| Plan       | Cron Jobs | Schedule                   | Timing Accuracy |
|------------|-----------|----------------------------|-----------------|
| **Hobby**  | 2 jobs    | **Once per day**           | ±59 minutes     |
| **Pro**    | 40 jobs   | **Unlimited frequency**    | Precise         |
| **Enterprise** | 100 jobs | **Unlimited frequency** | Precise         |

**Source:** [Vercel Cron Jobs Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)

---

## Schedule Options for Hobby Plan

### Option 1: Morning Processing (Current)
```
"schedule": "0 9 * * *"
```
- Runs: ~9:00 AM daily (between 9:00 and 9:59)
- Best for: European/Asian timezones
- Notifications delivered: Morning time

### Option 2: Evening Processing
```
"schedule": "0 21 * * *"
```
- Runs: ~9:00 PM daily (between 21:00 and 21:59)
- Best for: End of day summary
- Notifications delivered: Evening time

### Option 3: Midnight Processing
```
"schedule": "0 0 * * *"
```
- Runs: ~Midnight (between 00:00 and 00:59)
- Best for: Off-peak processing
- Notifications delivered: Late night/early morning

---

## Trade-offs

### With Hobby Plan (Once Daily)

**Pros:**
- ✅ Free
- ✅ Covers daily notification batches
- ✅ Sufficient for most users

**Cons:**
- ⚠️ **Delayed notifications** (up to 24 hours for urgent updates)
- ⚠️ **Timing uncertainty** (±59 minutes)
- ❌ Event updates notified next day (not real-time)
- ❌ New participant notifications batched

**Example:**
- User registers at 10:00 AM
- Organizer gets notification: **next day at ~9:00 AM** (23 hours later!)

---

## Upgrade to Pro Plan

### Schedule: Every 5 Minutes (Recommended)
```
"schedule": "*/5 * * * *"
```
- Runs: Every 5 minutes, 24/7
- 288 executions per day
- **Near real-time notifications** (max 5 min delay)

### Pro Plan Pricing
- **$20/month** per member
- Includes:
  - 40 cron jobs
  - Unlimited frequency
  - Precise timing
  - 1,000 GB-Hours Functions (usually enough)

**Source:** [Vercel Pro Plan](https://vercel.com/pricing)

---

## Recommendation

### For MVP / Testing
**Use Hobby Plan** with daily schedule (`0 9 * * *`)
- Good enough to test the system
- Users understand it's not real-time
- Can upgrade later

### For Production
**Upgrade to Pro Plan** with 5-minute schedule
- Professional user experience
- Timely notifications
- Better engagement
- Required for serious event platform

---

## Implementation

### Change Schedule (Hobby → Pro)

1. **Update vercel.json:**
   ```json
   {
     "crons": [{
       "path": "/api/cron/process-notifications",
       "schedule": "*/5 * * * *"
     }]
   }
   ```

2. **Commit & Deploy:**
   ```bash
   git add vercel.json
   git commit -m "chore: update cron to 5-minute schedule for Pro plan"
   git push origin main
   ```

3. **Verify in Vercel Dashboard:**
   - Settings → Cron Jobs
   - Check execution logs

---

## Queue Behavior

### Hobby Plan (Daily)
- Notifications accumulate in queue
- Processed once per day
- Batch of ~100-500 notifications
- Processing time: ~2-5 minutes

### Pro Plan (Every 5 min)
- Near real-time processing
- Batch of ~5-50 notifications
- Processing time: ~10-30 seconds
- Better user experience

---

## Monitoring

Check cron execution in Vercel:
- Dashboard → Project → Deployments → Functions
- Filter by `/api/cron/process-notifications`
- View logs, duration, errors

---

## Cost Comparison

| Scenario | Hobby (Free) | Pro ($20/mo) |
|----------|--------------|--------------|
| Notifications | Delayed (1 day) | Real-time (5 min) |
| User Experience | ⚠️ Acceptable | ✅ Professional |
| For Testing | ✅ Perfect | ⚠️ Overkill |
| For Production | ❌ Not recommended | ✅ Required |

---

**Updated:** December 14, 2025
