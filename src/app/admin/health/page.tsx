
import { checkConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
    const health = await checkConnection();

    return (
        <div className="p-8 font-mono bg-white text-black min-h-screen">
            <h1 className="text-2xl font-bold mb-4">System Health</h1>
            <div className="space-y-4">
                <div className="p-4 border rounded">
                    <h2 className="font-bold mb-2">Database</h2>
                    <div>Mode: <span className="font-bold">{health.mode}</span></div>
                    <div>Status: <span className={health.status === 'connected' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{health.status}</span></div>
                    {health.message && <div className="text-sm mt-1 text-gray-600">Message: {health.message}</div>}
                </div>

                <div className="p-4 border rounded">
                    <h2 className="font-bold mb-2">Environment</h2>
                    <div>DATABASE_URL: {process.env.DATABASE_URL ? '✅ Set' : '❌ Not Set'}</div>
                    <div>NODE_ENV: {process.env.NODE_ENV}</div>
                </div>
            </div>
            <div className="mt-8 text-sm text-gray-500">
                <p>Deploy Timestamp: {new Date().toISOString()}</p>
            </div>
        </div>
    );
}
