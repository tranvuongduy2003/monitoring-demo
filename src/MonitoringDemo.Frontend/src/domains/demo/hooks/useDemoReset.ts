import { useState } from 'react';
import { demoService } from '@/domains/demo/services/demoService';

export function useDemoReset(afterReset: () => Promise<void>) {
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function clearAllData() {
    setClearing(true);
    setMessage('');
    setError('');

    try {
      const result = await demoService.clearAllData();
      await afterReset();
      setMessage(
        `Cleared ${result.deletedOrders} orders and the in-app metric analytics. ` +
        'The background simulator remains active, so new data may appear shortly.',
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not clear demo data');
    } finally {
      setClearing(false);
    }
  }

  return { clearing, message, error, clearAllData };
}
