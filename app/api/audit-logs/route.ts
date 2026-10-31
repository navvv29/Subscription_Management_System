import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-helpers';
import { queryAuditLogs } from '@/lib/audit/audit-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType') || undefined;
  const entityId = searchParams.get('entityId') || undefined;
  const actorId = searchParams.get('actorId') || undefined;
  const action = searchParams.get('action') || undefined;
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  const logs = queryAuditLogs({
    entityType,
    entityId,
    actorId,
    action,
    limit,
  });

  return apiSuccess(logs);
}

