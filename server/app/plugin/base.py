from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List

from fastapi import FastAPI


class PluginBase(ABC):
    name: str
    version: str

    @abstractmethod
    def on_register(self, app: FastAPI) -> None: ...


class PluginRegistry:
    def __init__(self) -> None:
        self._plugins: Dict[str, PluginBase] = {}
        self._subscribers: Dict[str, List[Callable]] = {}

    def register(self, plugin: PluginBase, app: FastAPI) -> None:
        self._plugins[plugin.name] = plugin
        plugin.on_register(app)

    def subscribe(self, event: str, handler: Callable) -> None:
        self._subscribers.setdefault(event, []).append(handler)

    async def emit(self, event: str, payload: Any = None) -> None:
        for handler in self._subscribers.get(event, []):
            await handler(payload)


registry = PluginRegistry()
