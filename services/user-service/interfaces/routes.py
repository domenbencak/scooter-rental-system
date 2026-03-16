import logging
from uuid import UUID

from fastapi import APIRouter, Depends, status

from application.use_cases import GetUserUseCase, RegisterUserUseCase
from interfaces.dependencies import get_get_user_use_case, get_register_user_use_case
from interfaces.middleware import current_trace_id
from interfaces.schemas import GetUserResponse, RegisterUserRequest, RegisterUserResponse

router = APIRouter()
logger = logging.getLogger("user-service.routes")


@router.post("/users", status_code=status.HTTP_201_CREATED, response_model=RegisterUserResponse)
def register_user(
    request: RegisterUserRequest,
    use_case: RegisterUserUseCase = Depends(get_register_user_use_case),
) -> RegisterUserResponse:
    user = use_case.execute(email=request.email, full_name=request.fullName, phone=request.phone)
    logger.info("user_created_api userId=%s traceId=%s", user.user_id, current_trace_id())
    return RegisterUserResponse(
        userId=user.user_id,
        email=user.email,
        fullName=user.full_name,
        createdAt=user.created_at,
    )


@router.get("/users/{user_id}", response_model=GetUserResponse)
def get_user(
    user_id: UUID,
    use_case: GetUserUseCase = Depends(get_get_user_use_case),
) -> GetUserResponse:
    user = use_case.execute(user_id)
    logger.info("user_fetched_api userId=%s traceId=%s", user.user_id, current_trace_id())
    return GetUserResponse(
        userId=user.user_id,
        email=user.email,
        fullName=user.full_name,
        status=user.status,
    )
