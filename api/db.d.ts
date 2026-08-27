import sqlite3 from 'sqlite3';
export declare const dbRun: (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
export declare const dbGet: <T>(sql: string, params?: any[]) => Promise<T | undefined>;
export declare const dbAll: <T>(sql: string, params?: any[]) => Promise<T[]>;
export declare const initDb: () => Promise<void>;
//# sourceMappingURL=db.d.ts.map