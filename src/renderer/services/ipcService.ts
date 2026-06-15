import { PegRecord, InstrumentArchive, LibraryItem } from '../../shared/types';

const { ipcRenderer } = window.require('electron');

export const pegService = {
  create: (data: Omit<PegRecord, '_id'>): Promise<PegRecord> =>
    ipcRenderer.invoke('peg:create', data),
  find: (query?: any): Promise<PegRecord[]> =>
    ipcRenderer.invoke('peg:find', query),
  findOne: (id: string): Promise<PegRecord | null> =>
    ipcRenderer.invoke('peg:findOne', id),
  update: (id: string, data: Partial<PegRecord>): Promise<number> =>
    ipcRenderer.invoke('peg:update', id, data),
  remove: (id: string): Promise<number> =>
    ipcRenderer.invoke('peg:remove', id),
};

export const archiveService = {
  create: (data: Omit<InstrumentArchive, '_id'>): Promise<InstrumentArchive> =>
    ipcRenderer.invoke('archive:create', data),
  find: (query?: any): Promise<InstrumentArchive[]> =>
    ipcRenderer.invoke('archive:find', query),
  findOne: (id: string): Promise<InstrumentArchive | null> =>
    ipcRenderer.invoke('archive:findOne', id),
  update: (id: string, data: Partial<InstrumentArchive>): Promise<number> =>
    ipcRenderer.invoke('archive:update', id, data),
  remove: (id: string): Promise<number> =>
    ipcRenderer.invoke('archive:remove', id),
};

export const libraryService = {
  create: (data: Omit<LibraryItem, '_id'>): Promise<LibraryItem> =>
    ipcRenderer.invoke('library:create', data),
  find: (query?: any): Promise<LibraryItem[]> =>
    ipcRenderer.invoke('library:find', query),
  findOne: (id: string): Promise<LibraryItem | null> =>
    ipcRenderer.invoke('library:findOne', id),
  update: (id: string, data: Partial<LibraryItem>): Promise<number> =>
    ipcRenderer.invoke('library:update', id, data),
  remove: (id: string): Promise<number> =>
    ipcRenderer.invoke('library:remove', id),
};
