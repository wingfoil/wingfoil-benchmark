# lantern-lane-orders

The order book behind Lantern Lane Grocers, a neighbourhood grocer that delivers to its customers' doors. Customers
order from the catalogue; each order is priced, with a flat shipping charge that larger orders do not pay. This
package holds the order book, in TypeScript; the shop's website and its staff tools use its public API from
`src/index.ts`.

Prices are integer cents everywhere. Run the tests with `npm test`.
