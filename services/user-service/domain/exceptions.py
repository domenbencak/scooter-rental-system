class UserServiceError(Exception):
    error_code = "USER_SERVICE_ERROR"


class UserNotFoundError(UserServiceError):
    error_code = "RESOURCE_NOT_FOUND"


class UserConflictError(UserServiceError):
    error_code = "CONFLICT"
