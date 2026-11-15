import type { Category, CategoryInput } from '../types/finance';
import { IntegrityError, NotFoundError, ValidationError } from './errors';
import { STORAGE_KEYS, generateId, readCollection, resolveAsync, writeCollection } from './storage';
import { transactionService } from './transactionService';

/** Contrato REST futuro: /api/v1/categories */

const DEFAULT_CATEGORIES: CategoryInput[] = [
  { name: 'Alimentação', color: '#f97316', type: 'EXPENSE' },
  { name: 'Transporte', color: '#3b82f6', type: 'EXPENSE' },
  { name: 'Moradia e Contas', color: '#8b5cf6', type: 'EXPENSE' },
  { name: 'Lazer', color: '#ec4899', type: 'EXPENSE' },
  { name: 'Saúde e Treino', color: '#14b8a6', type: 'EXPENSE' },
  { name: 'Outros', color: '#64748b', type: 'EXPENSE' },
  { name: 'Salário', color: '#10b981', type: 'INCOME' },
  { name: 'Renda Extra', color: '#22c55e', type: 'INCOME' },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function load(): Category[] {
  const stored = readCollection<Category>(STORAGE_KEYS.categories);
  if (stored !== null) return stored;
  // Seed no primeiro acesso (equivalente a uma migration Flyway com dados iniciais).
  const seeded = DEFAULT_CATEGORIES.map((c) => ({ ...c, id: generateId() }));
  writeCollection(STORAGE_KEYS.categories, seeded);
  return seeded;
}

function validate(input: CategoryInput, all: Category[], ignoreId?: string): CategoryInput {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Informe o nome da categoria.');
  if (name.length > 40) throw new ValidationError('O nome deve ter no máximo 40 caracteres.');
  if (!HEX_RE.test(input.color)) throw new ValidationError('Cor inválida. Use o formato #RRGGBB.');
  const duplicate = all.some(
    (c) => c.id !== ignoreId && c.name.trim().toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'),
  );
  if (duplicate) throw new ValidationError('Já existe uma categoria com esse nome.');
  return { name, color: input.color.toLowerCase(), type: input.type };
}

export const categoryService = {
  /** GET /api/v1/categories */
  list(): Promise<Category[]> {
    return resolveAsync(() => load());
  },

  /** POST /api/v1/categories */
  create(input: CategoryInput): Promise<Category> {
    return resolveAsync(() => {
      const all = load();
      const created: Category = { ...validate(input, all), id: generateId() };
      writeCollection(STORAGE_KEYS.categories, [...all, created]);
      return created;
    });
  },

  /** PUT /api/v1/categories/{id} */
  async update(id: string, input: CategoryInput): Promise<Category> {
    const all = load();
    const current = all.find((c) => c.id === id);
    if (!current) throw new NotFoundError('Categoria não encontrada.');
    const data = validate(input, all, id);

    // Integridade: não permitir mudar o tipo se isso deixar transações incompatíveis.
    if (data.type !== 'BOTH' && data.type !== current.type) {
      const linked = await transactionService.countByCategory(id);
      const incompatible = linked.byType[data.type === 'EXPENSE' ? 'INCOME' : 'EXPENSE'];
      if (incompatible > 0) {
        throw new IntegrityError(
          `Não é possível mudar o tipo: ${incompatible} lançamento(s) de ${
            data.type === 'EXPENSE' ? 'receita' : 'gasto'
          } usam esta categoria.`,
        );
      }
    }

    const updated: Category = { ...current, ...data };
    writeCollection(
      STORAGE_KEYS.categories,
      all.map((c) => (c.id === id ? updated : c)),
    );
    return updated;
  },

  /** DELETE /api/v1/categories/{id} — 409 se houver transações vinculadas. */
  async remove(id: string): Promise<void> {
    const all = load();
    if (!all.some((c) => c.id === id)) throw new NotFoundError('Categoria não encontrada.');
    const { total } = await transactionService.countByCategory(id);
    if (total > 0) {
      throw new IntegrityError(
        `Esta categoria possui ${total} lançamento(s) vinculado(s) e não pode ser excluída. ` +
          'Reatribua ou exclua esses lançamentos primeiro.',
      );
    }
    writeCollection(
      STORAGE_KEYS.categories,
      all.filter((c) => c.id !== id),
    );
  },
};
