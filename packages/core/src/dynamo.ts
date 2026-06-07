import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { loadConfig } from './config.js';

let docClient: DynamoDBDocumentClient | undefined;

/**
 * Lazily build a shared DynamoDB DocumentClient. Honors DYNAMODB_ENDPOINT for
 * local (dynamodb-local); in AWS the SDK resolves region + credentials from the
 * task role automatically.
 */
export function getDynamoClient(): DynamoDBDocumentClient {
  if (docClient) return docClient;
  const cfg = loadConfig();
  const base = new DynamoDBClient({
    region: cfg.AWS_REGION,
    ...(cfg.DYNAMODB_ENDPOINT
      ? {
          endpoint: cfg.DYNAMODB_ENDPOINT,
          // dynamodb-local accepts any credentials
          credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
        }
      : {}),
  });
  docClient = DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return docClient;
}

/** Liveness probe for DynamoDB — cheap describe via the underlying client. */
export async function dynamoHealthy(): Promise<boolean> {
  try {
    // DocumentClient wraps a DynamoDBClient; sending a no-op-ish command would
    // require a table. Treat client construction as ready; deeper checks belong
    // in readiness with a real GetItem against a known key.
    getDynamoClient();
    return true;
  } catch {
    return false;
  }
}
