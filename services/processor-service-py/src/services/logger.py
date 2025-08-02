import logging
import sys
from ..config import settings

def setup_logger():
    """
    Configures and returns a logger instance.
    """
    logger = logging.getLogger(__name__)
    logger.setLevel(settings.LOG_LEVEL.upper())

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    
    if not logger.handlers:
        logger.addHandler(handler)
        
    logger.propagate = False

    return logger

logger = setup_logger() 