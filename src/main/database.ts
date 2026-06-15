import * as Datastore from 'nedb';
import * as path from 'path';
import { app } from 'electron';
import { PegRecord, InstrumentArchive, LibraryItem } from '../shared/types';

export class DatabaseService {
  private pegDb: Datastore<PegRecord>;
  private archiveDb: Datastore<InstrumentArchive>;
  private libraryDb: Datastore<LibraryItem>;

  constructor() {
    const dbPath = this.getDbPath();
    this.pegDb = new Datastore({ filename: path.join(dbPath, 'pegs.db'), autoload: false });
    this.archiveDb = new Datastore({ filename: path.join(dbPath, 'archives.db'), autoload: false });
    this.libraryDb = new Datastore({ filename: path.join(dbPath, 'library.db'), autoload: false });
  }

  private getDbPath(): string {
    if (app) {
      return path.join(app.getPath('userData'), 'databases');
    }
    return './data';
  }

  init(): void {
    this.pegDb.loadDatabase();
    this.archiveDb.loadDatabase();
    this.libraryDb.loadDatabase();
  }

  createPegRecord(data: Omit<PegRecord, '_id'>): Promise<PegRecord> {
    return new Promise((resolve, reject) => {
      const record = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.pegDb.insert(record, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
  }

  findPegRecords(query: any = {}): Promise<PegRecord[]> {
    return new Promise((resolve, reject) => {
      this.pegDb.find(query).sort({ createdAt: -1 }).exec((err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  }

  findOnePegRecord(id: string): Promise<PegRecord | null> {
    return new Promise((resolve, reject) => {
      this.pegDb.findOne({ _id: id }, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
  }

  updatePegRecord(id: string, data: Partial<PegRecord>): Promise<number> {
    return new Promise((resolve, reject) => {
      const update = { ...data, updatedAt: new Date().toISOString() };
      this.pegDb.update({ _id: id }, { $set: update }, {}, (err, num) => {
        if (err) reject(err);
        else resolve(num);
      });
    });
  }

  removePegRecord(id: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.pegDb.remove({ _id: id }, {}, (err, num) => {
        if (err) reject(err);
        else resolve(num);
      });
    });
  }

  createArchive(data: Omit<InstrumentArchive, '_id'>): Promise<InstrumentArchive> {
    return new Promise((resolve, reject) => {
      const record = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.archiveDb.insert(record, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
  }

  findArchives(query: any = {}): Promise<InstrumentArchive[]> {
    return new Promise((resolve, reject) => {
      this.archiveDb.find(query).sort({ createdAt: -1 }).exec((err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  }

  findOneArchive(id: string): Promise<InstrumentArchive | null> {
    return new Promise((resolve, reject) => {
      this.archiveDb.findOne({ _id: id }, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
  }

  updateArchive(id: string, data: Partial<InstrumentArchive>): Promise<number> {
    return new Promise((resolve, reject) => {
      const update = { ...data, updatedAt: new Date().toISOString() };
      this.archiveDb.update({ _id: id }, { $set: update }, {}, (err, num) => {
        if (err) reject(err);
        else resolve(num);
      });
    });
  }

  removeArchive(id: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.archiveDb.remove({ _id: id }, {}, (err, num) => {
        if (err) reject(err);
        else resolve(num);
      });
    });
  }

  createLibraryItem(data: Omit<LibraryItem, '_id'>): Promise<LibraryItem> {
    return new Promise((resolve, reject) => {
      const record = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.libraryDb.insert(record, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
  }

  findLibraryItems(query: any = {}): Promise<LibraryItem[]> {
    return new Promise((resolve, reject) => {
      this.libraryDb.find(query).sort({ createdAt: -1 }).exec((err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  }

  findOneLibraryItem(id: string): Promise<LibraryItem | null> {
    return new Promise((resolve, reject) => {
      this.libraryDb.findOne({ _id: id }, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
  }

  updateLibraryItem(id: string, data: Partial<LibraryItem>): Promise<number> {
    return new Promise((resolve, reject) => {
      const update = { ...data, updatedAt: new Date().toISOString() };
      this.libraryDb.update({ _id: id }, { $set: update }, {}, (err, num) => {
        if (err) reject(err);
        else resolve(num);
      });
    });
  }

  removeLibraryItem(id: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.libraryDb.remove({ _id: id }, {}, (err, num) => {
        if (err) reject(err);
        else resolve(num);
      });
    });
  }
}
