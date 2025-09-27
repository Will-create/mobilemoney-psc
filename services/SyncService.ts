import { StorageService } from './StorageService';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TELEMETRY_ENDPOINT = 'https://telemetry.example.com/logs';

export class SyncService {
  private static instance: SyncService;
  private intervalId: NodeJS.Timeout | null = null;
  private storageService = StorageService.getInstance();

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  start() {
    if (this.intervalId) {
      this.stop();
    }
    this.intervalId = setInterval(() => this.syncNow(), SYNC_INTERVAL);
    // Run a sync on start as well
    this.syncNow();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async syncNow() {
    console.log('Running background sync...');
    const profile = await this.storageService.getUserProfile();
    if (!profile) {
      console.log('Sync skipped: User profile not found.');
      return;
    }

    const events = await this.storageService.getUnsyncedEvents();
    if (events.length === 0) {
      console.log('Sync skipped: No new events to send.');
      return;
    }

    const payload = events.map(event => {
      const details = JSON.parse(event.details || '{}');
      return {
        user_id: profile.userId,
        timestamp: new Date(event.timestamp).toISOString(),
        event_type: event.event_type,
        ...details,
      };
    });

    try {
      const response = await fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`Successfully synced ${events.length} events.`);
        const eventIds = events.map(e => e.id);
        await this.storageService.markEventsAsSynced(eventIds);
      } else {
        console.error('Sync failed: Server responded with', response.status);
        // The events will be retried on the next interval
      }
    } catch (error) {
      console.error('Sync failed: Network error.', error);
      // The events will be retried on the next interval
    }
  }
}
