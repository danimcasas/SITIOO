const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {Store,validateInput} = require('../packages/projects/store.cjs');
test('rechaza entradas no válidas y conserva un nombre legible',() => {
  assert.throws(() => validateInput({name:'',type:'wordpress'}));
  assert.throws(() => validateInput({name:'Web',type:'shell'}));
  assert.deepEqual(validateInput({name:' Mi web ',type:'wordpress'}),{name:'Mi web',type:'wordpress'});
});
test('impide escapar del directorio del proyecto',() => {
  const store = new Store('/unused'); assert.throws(() => store.directory('../../outside'));
});
test('persiste proyectos y no sobrescribe un registro corrupto',async () => {
  const dir = await fs.mkdtemp(path.resolve('.local/test-store-'));
  const store = new Store(dir); await store.load();
  const item = await store.add({name:'Proyecto de prueba',type:'wordpress'},18765);
  const other = new Store(dir); await other.load(); assert.equal(other.get(item.id).name,'Proyecto de prueba');
  await fs.writeFile(other.file,'corrupt');
  await assert.rejects(new Store(dir).load()); assert.equal(await fs.readFile(other.file,'utf8'),'corrupt');
});
