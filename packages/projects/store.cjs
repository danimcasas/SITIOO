'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
function validateInput(input) {
  if (!input || typeof input !== 'object') throw new Error('Faltan los datos del proyecto.');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 80 || /[\x00-\x1f]/.test(name)) throw new Error('Escribe un nombre de proyecto de hasta 80 caracteres.');
  if (!['wordpress','woocommerce'].includes(input.type)) throw new Error('Elige el tipo de proyecto.');
  return {name,type:input.type};
}
class Store {
  constructor(root) { this.root = root; this.file = path.join(root,'projects.json'); this.items = []; }
  async load() {
    await fs.mkdir(this.root,{recursive:true,mode:0o700});
    try {
      const items = JSON.parse(await fs.readFile(this.file,'utf8'));
      if (!Array.isArray(items) || items.some(p => !/^[a-f0-9-]{36}$/.test(p.id) || !Number.isInteger(p.port) || p.port < 1024 || p.port > 65535 || typeof p.name !== 'string')) throw new Error('invalid');
      this.items = items;
    } catch (e) { if (e.code !== 'ENOENT') throw new Error('No se puede leer el registro de proyectos. Se ha conservado para recuperarlo.'); }
    return this.items;
  }
  async save() {
    await fs.writeFile(this.file+'.tmp',JSON.stringify(this.items,null,2),{mode:0o600});
    await fs.rename(this.file+'.tmp',this.file);
  }
  directory(id) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Proyecto no válido.');
    return path.join(this.root,id);
  }
  get(id) { const item = this.items.find(p => p.id === id); if (!item) throw new Error('No se ha encontrado el proyecto.'); return item; }
  async add(input,port) {
    const item = {id:randomUUID(),...validateInput(input),port,status:'installing',createdAt:new Date().toISOString()};
    this.items.push(item); await this.save(); return item;
  }
}
module.exports = {Store,validateInput};
