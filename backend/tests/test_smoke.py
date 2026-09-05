def test_config_loads():
    from app.config import settings

    assert settings.database_url
    assert settings.redis_url


def test_db_module_imports():
    import app.db  # noqa: F401
