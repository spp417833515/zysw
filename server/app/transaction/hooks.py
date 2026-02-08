from app.plugin.base import registry

# Transaction event hooks - plugins can subscribe to these
TRANSACTION_EVENTS = [
    "transaction.created",
    "transaction.updated",
    "transaction.deleted",
    "transaction.payment_confirmed",
    "transaction.invoice_confirmed",
    "transaction.invoice_skipped",
    "transaction.tax_declared",
]


def subscribe(event: str, handler):
    registry.subscribe(event, handler)
