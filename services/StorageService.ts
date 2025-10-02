import * as SQLite from 'expo-sqlite';
import { UserProfile, WalletSettings, TransactionRecord } from '@/types';

export class StorageService {
  private static instance: StorageService;
  private db: SQLite.SQLiteDatabase | null = null;

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('nfc_payments.db');
      await this.createTables();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error('Database initialization failed');
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const queries = [
      `CREATE TABLE IF NOT EXISTS user_profiles (
        userId TEXT PRIMARY KEY,
        displayName TEXT NOT NULL,
        phoneNumber TEXT,
        operatorPreferences TEXT NOT NULL,
        createdAt INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      `CREATE TABLE IF NOT EXISTS wallet_settings (
        id INTEGER PRIMARY KEY,
        defaultOperator TEXT NOT NULL,
        pinHash TEXT NOT NULL,
        biometricEnabled INTEGER DEFAULT 0,
        encryptionKeyId TEXT NOT NULL,
        updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        transactionId TEXT PRIMARY KEY,
        direction TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        operator TEXT NOT NULL,
        counterpartyId TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL,
        signedProof TEXT NOT NULL,
        rawLogs TEXT,
        createdAt INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS event_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        details TEXT,
        synced INTEGER DEFAULT 0
      )`
    ];

    for (const query of queries) {
      await this.db.execAsync(query);
    }

    // await this.db.runAsync(`DELETE FROM user_profiles WHERE phoneNumber = '22656920671'`);
    let user = await this.getUserProfile();

    console.log('User :', user);

    
    !user && await this.db.runAsync(
      `INSERT OR REPLACE INTO user_profiles
       (userId, displayName, phoneNumber, operatorPreferences)
       VALUES (?, ?, ?, ?)`,
      [
        'louisbertson', 
      'Louis Bertson',
      '22656920671',
      '{}'
      ]
    );
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT OR REPLACE INTO user_profiles
       (userId, displayName, phoneNumber, operatorPreferences)
       VALUES (?, ?, ?, ?)`,
      [
        profile.userId,
        profile.displayName,
        profile.phoneNumber || null,
        JSON.stringify(profile.operatorPreferences)
      ]
    );
  }

  async getUserProfile(): Promise<UserProfile | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      'SELECT * FROM user_profiles LIMIT 1'
    );

    if (!result) return null;

    return {
      userId: result.userId,
      displayName: result.displayName,
      phoneNumber: result.phoneNumber,
      operatorPreferences: JSON.parse(result.operatorPreferences),
      phoneNumbers: { sim1: result.phoneNumber}
    };
  }

  async saveWalletSettings(settings: WalletSettings): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT OR REPLACE INTO wallet_settings
       (id, defaultOperator, pinHash, biometricEnabled, encryptionKeyId)
       VALUES (1, ?, ?, ?, ?)`,
      [
        settings.defaultOperator,
        settings.pinHash,
        settings.biometricEnabled ? 1 : 0,
        settings.encryptionKeyId
      ]
    );
  }

  async getWalletSettings(): Promise<WalletSettings | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      'SELECT * FROM wallet_settings WHERE id = 1'
    );

    if (!result) return null;

    return {
      defaultOperator: result.defaultOperator,
      pinHash: result.pinHash,
      biometricEnabled: result.biometricEnabled === 1,
      encryptionKeyId: result.encryptionKeyId
    };
  }

  async saveTransaction(transaction: Omit<TransactionRecord, 'ussdPlanUsed'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO transactions
       (transactionId, direction, amount, currency, operator, counterpartyId,
        timestamp, status, signedProof, rawLogs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.transactionId,
        transaction.direction,
        transaction.amount,
        transaction.currency,
        transaction.operator,
        transaction.counterpartyId,
        transaction.timestamp,
        transaction.status,
        transaction.signedProof,
        transaction.rawLogs || null
      ]
    );
  }

  async getTransactions(limit = 50): Promise<TransactionRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync(
      'SELECT * FROM transactions ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );

    return results.map(row => ({
        transactionId: row.transactionId,
        direction: row.direction,
        amount: row.amount,
        currency: row.currency,
        operator: row.operator,
        counterpartyId: row.counterpartyId,
        timestamp: row.timestamp,
        status: row.status,
        signedProof: row.signedProof,
        rawLogs: row.rawLogs
      }));
  }

  async updateTransactionStatus(transactionId: string, status: 'pending' | 'success' | 'failed' | 'cancelled'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE transactions SET status = ? WHERE transactionId = ?',
      [status, transactionId]
    );
  }

  async saveSimMappings(mappings: { [key: string]: number }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      ['sim_mappings', JSON.stringify(mappings)]
    );
  }

  async getSimMappings(): Promise<{ [key: string]: number } | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync(
      `SELECT value FROM settings WHERE key = ?`,
      ['sim_mappings']
    );
    if (!result) return null;
    return JSON.parse(result.value);
  }

  async logEvent(eventType: string, details: object = {}): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      `INSERT INTO event_logs (timestamp, event_type, details) VALUES (?, ?, ?)`,
      [Date.now(), eventType, JSON.stringify(details)]
    );
  }

  async getUnsyncedEvents(limit = 100): Promise<{ id: number; timestamp: number; event_type: string; details: string; }[]> {
    if (!this.db) throw new Error('Database not initialized');
    const results = await this.db.getAllAsync(
      `SELECT * FROM event_logs WHERE synced = 0 ORDER BY timestamp ASC LIMIT ?`,
      [limit]
    );
    return results;
  }

  async markEventsAsSynced(eventIds: number[]): Promise<void> {
    if (!this.db || eventIds.length === 0) return;
    const placeholders = eventIds.map(() => '?').join(',');
    await this.db.runAsync(
      `UPDATE event_logs SET synced = 1 WHERE id IN (${placeholders})`,
      eventIds
    );
  }

  async purgeOldEvents(maxAgeInDays = 7): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const threshold = Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000;
    await this.db.runAsync(
      `DELETE FROM event_logs WHERE timestamp < ? AND synced = 1`,
      [threshold]
    );
  }
}
