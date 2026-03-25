## Observability: Metrics, Tracing, and Monitoring

- Logging alone (see `logging.md`) tells you what happened inside one invocation. Metrics, tracing, and alarms tell you how your system is performing overall.
- Without observability, you discover problems when users report them. With it, you discover problems before users notice.
- Lambda provides built-in metrics (invocations, errors, duration, throttles) for free. Custom metrics and tracing require setup.

### Built-in Lambda metrics (free, zero setup)

CloudWatch automatically tracks these for every Lambda function:

| Metric | What it tells you |
|---|---|
| Invocations | Total number of requests |
| Errors | Invocations that returned an error or timed out |
| Duration | Execution time (P50, P90, P99) |
| Throttles | Invocations rejected due to concurrency limits |
| ConcurrentExecutions | How many environments are running simultaneously |
| IteratorAge | For stream-based triggers (SQS, Kinesis): how far behind you are |

Access these in CloudWatch Console → Metrics → Lambda, or query via CLI:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=my-app \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics p99
```

---

### Custom Metrics

#### Tier 1: CloudWatch PutMetricData (zero dependencies)

- When to use: 1-2 custom metrics, low volume, simplest approach.

```typescript
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cw = new CloudWatchClient({});

export async function emitMetric(name: string, value: number, unit: 'Count' | 'Milliseconds' | 'None' = 'Count') {
  await cw.send(new PutMetricDataCommand({
    Namespace: 'MyApp',
    MetricData: [{
      MetricName: name,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
    }],
  }));
}

// Usage in handler:
await emitMetric('OrderCreated', 1);
await emitMetric('OrderTotal', order.totalCents / 100, 'None');
```

- **Limitations**: each `PutMetricData` call adds ~50ms latency and costs $0.01 per 1,000 API calls. At high volume, this adds up in both latency and cost.

#### Tier 2: Embedded Metric Format (zero dependencies, zero latency)

- When to use: multiple custom metrics, want zero-latency metric emission.

CloudWatch supports Embedded Metric Format (EMF): write specially formatted JSON to stdout and CloudWatch extracts metrics automatically. No API calls needed.

```typescript
// src/lib/metrics.ts

interface MetricEntry {
  name: string;
  value: number;
  unit: 'Count' | 'Milliseconds' | 'None' | 'Bytes';
}

export function emitMetrics(namespace: string, metrics: MetricEntry[], dimensions: Record<string, string> = {}) {
  const metricDefinitions = metrics.map((m) => ({
    Name: m.name,
    Unit: m.unit,
  }));

  const metricValues: Record<string, number> = {};
  for (const m of metrics) {
    metricValues[m.name] = m.value;
  }

  const emfLog = {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [{
        Namespace: namespace,
        Dimensions: [Object.keys(dimensions)],
        Metrics: metricDefinitions,
      }],
    },
    ...dimensions,
    ...metricValues,
  };

  console.log(JSON.stringify(emfLog));
}
```

```typescript
// Usage in handler:
import { emitMetrics } from '../lib/metrics.js';

emitMetrics('MyApp', [
  { name: 'OrderCreated', value: 1, unit: 'Count' },
  { name: 'OrderTotalCents', value: order.totalCents, unit: 'None' },
  { name: 'ProcessingTime', value: durationMs, unit: 'Milliseconds' },
], { Environment: config.env, Action: 'createOrder' });
```

- **Advantages over Tier 1**: zero API call latency (just a `console.log`), zero API call cost, can emit multiple metrics in one log entry, dimensions for free.

#### Tier 3: AWS Lambda Powertools Metrics (full observability)

- When to use: production apps, want automatic cold start metrics, multiple dimensions, and a clean API.

```typescript
// src/lib/metrics.ts
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

export const metrics = new Metrics({
  namespace: 'MyApp',
  serviceName: 'orders',
  defaultDimensions: { Environment: process.env.ENV || 'dev' },
});
```

```typescript
// Usage in handler:
import { metrics } from '../lib/metrics.js';

export async function handler(params: InputParams, context: any) {
  metrics.addMetric('OrderCreated', MetricUnit.Count, 1);
  metrics.addMetric('OrderTotalCents', MetricUnit.None, params.totalCents);
  metrics.addMetadata('orderId', order.id); // searchable but not a metric

  // Must call publishStoredMetrics at end of handler
  // (or use middy middleware for automatic flush)
  metrics.publishStoredMetrics();
}
```

- **Advantages over Tier 2**: cleaner API, automatic cold start metric, metadata support, built-in flush, configurable default dimensions.
- **Note**: uses EMF under the hood — same zero-latency approach as Tier 2, just a nicer API.

---

### Distributed Tracing

#### Tier 1: Manual timing (zero dependencies)

```typescript
const start = Date.now();
const result = await db.query(sql);
const durationMs = Date.now() - start;
logger.info('DB query completed', { durationMs, query: 'getOrder' });
```

- Good enough for identifying slow operations. Logged as structured JSON (queryable in CloudWatch Logs Insights).

#### Tier 2: AWS X-Ray (built-in, free tier)

Enable X-Ray tracing on your Lambda function:

```yaml
# SAM template
MyFunction:
  Type: AWS::Serverless::Function
  Properties:
    Tracing: Active
```

X-Ray automatically traces:
- Lambda invocation duration
- AWS SDK calls (DynamoDB, S3, SQS, etc.)
- HTTP calls (if using the X-Ray SDK)

View traces in the AWS X-Ray console — see a waterfall of every external call your handler makes.

- **Cost**: free for the first 100,000 traces/month, then $5 per million.

#### Tier 3: AWS Lambda Powertools Tracer

```typescript
import { Tracer } from '@aws-lambda-powertools/tracer';

export const tracer = new Tracer({ serviceName: 'orders' });

// In handler:
const subsegment = tracer.getSegment()!.addNewSubsegment('createOrder');
try {
  const order = await createOrder(params);
  subsegment.addAnnotation('orderId', order.id);
  subsegment.close();
} catch (err) {
  subsegment.addError(err as Error);
  subsegment.close();
  throw err;
}
```

- **Advantages**: custom subsegments, annotations (searchable in X-Ray), automatic capture of AWS SDK and HTTP calls, works with Powertools Logger for correlated traces + logs.

---

### Monitoring and Alarms

Set up CloudWatch alarms to get notified before users report problems:

```bash
# Alert when error rate exceeds 5% over 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name my-app-high-error-rate \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=my-app \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts

# Alert when P99 duration exceeds 5 seconds
aws cloudwatch put-metric-alarm \
  --alarm-name my-app-high-latency \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=my-app \
  --extended-statistic p99 \
  --period 300 \
  --threshold 5000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

**Recommended alarms for every Lambda:**

| Alarm | Metric | Threshold | Why |
|---|---|---|---|
| High error rate | Errors | >5 per 5 min | Something is broken |
| High latency | Duration P99 | >5000ms | Performance degradation |
| Throttled | Throttles | >0 per 5 min | Hitting concurrency limits |
| High iterator age | IteratorAge | >60000ms | Falling behind on stream processing |

---

### Tier comparison (metrics)

| Aspect | Tier 1 (PutMetricData) | Tier 2 (EMF) | Tier 3 (Powertools) |
|---|---|---|---|
| Dependencies | @aws-sdk/client-cloudwatch | None | @aws-lambda-powertools/metrics |
| Latency cost | ~50ms per call | Zero (stdout) | Zero (stdout via EMF) |
| API cost | $0.01/1000 calls | Free | Free |
| Custom dimensions | Manual | Manual | Built-in + defaults |
| Cold start metric | No | No | Automatic |
| Best for | 1-2 metrics | Most projects | Production / teams |

### Key rules

- Always monitor the built-in Lambda metrics — they're free and require zero code.
- Use EMF (Tier 2+) for custom metrics. Never call PutMetricData in the hot path of a request.
- Set up alarms on errors, duration P99, and throttles at minimum.
- Send alarm notifications to SNS → email, Slack, or PagerDuty.
- Enable X-Ray tracing on production functions — it's nearly free and invaluable for debugging slow invocations.
- Track business metrics (orders created, payments processed) alongside technical metrics. Business metrics detect problems that error rates miss.
- See `logging.md` for structured logging, which complements metrics and tracing.
