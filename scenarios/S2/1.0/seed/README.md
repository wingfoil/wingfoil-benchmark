# order-service

The order and inventory service behind the web shop: the product catalogue, stock levels, orders and
their lines, discounts and coupons, VAT, shipping, cancellations and invoices. It is a TypeScript
library with no runtime dependency; `src/index.ts` is its public API, and `createShop()` wires a shop
together.

```sh
npm test    # node --test "test/*.test.ts" — Node 22.18 or later runs the TypeScript tests as they are
```

## Business rules

These are the rules the service implements. When the code and this list disagree, this list is right.

### Money and dates

- Every amount is an integer number of euro cents. Every percentage is applied to an amount in cents
  and rounded half up to the cent (0.5 cent and above rounds up).
- Dates are calendar days written `YYYY-MM-DD`. Periods given as "from … to …" include both days.

### Products

- A product has a SKU, a name, a price, a VAT class and a weight in grams.
- SKUs are case-insensitive and ignore surrounding spaces: `ab-102`, ` AB-102 ` and `AB-102` are the
  same product. The service always shows a SKU in upper case.
- A product that is no longer sold stays in the catalogue, so that past orders still name it, but
  cannot be ordered. A new price applies to orders placed from then on.

### Stock

- Placing an order reserves its units: the available stock is what is on hand minus what placed orders
  hold. An order that asks for more than is available is refused, and nothing is reserved.
- Shipping an order takes its units off hand. Cancelling an order returns its units to the available
  stock.
- A product with fewer than 5 available units is listed as low in the stock report.

### Orders

- An order has a customer, a date and at least one line; each line is a SKU and a whole quantity above
  zero. Two lines with the same SKU are merged into one.
- Orders are numbered ORD-0001, ORD-0002, … in the order they are placed.
- An order is confirmed when placed, then shipped or cancelled. A shipped order cannot be
  cancelled, and a cancelled order cannot be shipped.
- An order can be cancelled up to and including the 14th day after the day it was placed.
  Cancelling it returns its units and gives back its coupon, if the coupon was single-use.

### Discounts

- Volume discount: a line of 10 units or more gets 10% off that line.
- Coupons: an order can use at most one coupon. A coupon takes either a percentage or a fixed
  amount off, and applies to the order's subtotal after volume discounts. A fixed coupon never takes
  off more than that subtotal.
- A coupon is valid from its first day to its last day, both included. It may require a minimum
  subtotal (after volume discounts). Coupon codes are case-insensitive.
- A single-use coupon can be used by one order only; if that order is cancelled, the coupon can be
  used again.
- All discounts of an order together never take off more than 50% of its gross amount (its lines at
  their prices); the coupon is reduced to fit.
- For VAT, a coupon's amount is spread over the order's lines in proportion to their amounts after
  volume discounts.

### Shipping

- Shipping is priced by the parcel's total weight: up to 1 kg €4.90, up to 5 kg €8.90, up to 20 kg
  €14.90, heavier €29.90.
- Shipping is free when the goods come to €50.00 or more, after every discount and before VAT.

### VAT

- Rates by VAT class: standard 22%, reduced 10%, super-reduced 4%, exempt 0%.
- VAT is computed line by line, on each line's net amount after every discount, and rounded half up
  to the cent on each line.
- Shipping is subject to VAT at the standard rate (22%), shown on its own line of the receipt.
- The order total is goods + shipping + VAT on goods + VAT on shipping.

### Invoices

- A shipped order gets one invoice, dated the day it shipped and numbered per year (2026/0001, …), with
  its VAT summarised by rate.
