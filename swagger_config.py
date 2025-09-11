# swagger_config.py
"""
Swagger configuration for One-Sovico API documentation
"""

from flasgger import Swagger

# Swagger configuration
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec_1',
            "route": '/apispec_1.json',
            "rule_filter": lambda rule: True,  # all in
            "model_filter": lambda tag: True,  # all in
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/swagger/"
}

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "One-Sovico Banking Platform API",
        "description": "API Documentation for One-Sovico Banking & Blockchain Platform",
        "contact": {
            "responsibleOrganization": "Sovico Holdings",
            "responsibleDeveloper": "One-Sovico Team",
            "email": "api@sovico.com.vn",
            "url": "https://sovico.com.vn",
        },
        "termsOfService": "https://sovico.com.vn/terms",
        "version": "1.0.0"
    },
    "host": "127.0.0.1:5000",  # overrides localhost:500
    "basePath": "/",  # base bash for blueprint registration
    "schemes": [
        "http",
        "https"
    ],
    "operationId": "getmyData",
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\""
        }
    },
    "security": [
        {
            "Bearer": []
        }
    ]
}

def init_swagger(app):
    """Initialize Swagger documentation for the Flask app"""
    return Swagger(app, config=swagger_config, template=swagger_template)
