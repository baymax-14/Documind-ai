"""Structured logging configuration."""

import logging
import sys
import json
from datetime import datetime, timezone
from typing import Any, Dict


class JSONFormatter(logging.Formatter):
    """Formats log records into structured JSON."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "props"):
            log_data.update(record.props)
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)


class StructuredLoggerAdapter(logging.LoggerAdapter):
    """Logger adapter that captures arbitrary kwargs into structured props."""

    def process(self, msg: Any, kwargs: Dict[str, Any]):
        standard_keys = {"exc_info", "stack_info", "stacklevel", "extra"}
        custom_kwargs = {k: v for k, v in kwargs.items() if k not in standard_keys}
        for k in custom_kwargs:
            del kwargs[k]

        extra = kwargs.get("extra", {})
        props = extra.get("props", {})
        props.update(custom_kwargs)
        extra["props"] = props
        kwargs["extra"] = extra
        return msg, kwargs


def setup_logging(debug: bool = False) -> StructuredLoggerAdapter:
    """Configures application logger."""
    level = logging.DEBUG if debug else logging.INFO
    base_logger = logging.getLogger("documind")
    base_logger.setLevel(level)

    # Avoid duplicate handlers
    if not base_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        base_logger.addHandler(handler)

    return StructuredLoggerAdapter(base_logger, {})


logger = setup_logging()
