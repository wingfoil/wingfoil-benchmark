import { err, ok } from './result.ts';
import type { Result } from './result.ts';

/** A customer of the shop, with how to reach them about a delivery. */
export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
}

/** The shop's customers, by id. */
export interface Customers {
  /** Adds a customer; an id already used, an empty name or an email without `@` is refused. */
  add(customer: Customer): Result<Customer>;
  /** The customer with this id. */
  get(id: string): Result<Customer>;
}

/**
 * An empty customer list, kept in memory.
 */
export function createCustomers(): Customers {
  const customers = new Map<string, Customer>();
  return {
    add(customer) {
      const name = customer.name.trim();
      if (name === '') return err('invalid', 'a customer needs a name');
      if (!customer.email.includes('@')) return err('invalid', `${customer.email} is not an email address`);
      if (customers.has(customer.id)) return err('duplicate', `customer ${customer.id} already exists`);
      const added = { id: customer.id, name, email: customer.email.trim(), phone: customer.phone.trim() };
      customers.set(added.id, added);
      return ok(added);
    },
    get(id) {
      const customer = customers.get(id);
      return customer === undefined ? err('not-found', `no customer ${id}`) : ok(customer);
    },
  };
}
