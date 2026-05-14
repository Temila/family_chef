"""
家味 · Family Chef - 订单管理路由
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user_from_token
from app.schemas.order import OrderCreate, OrderStatusUpdate, OrderListResponse, OrderDetailResponse, OrderItemResponse
from app.schemas.common import PageResponse
from app.services.order_service import order_service
from app.middleware.logging import log_action
from app.models.user import User
from app.models.order import Order
from app.models.dish import Dish

router = APIRouter()


async def build_order_detail(db, order):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )
    order = result.scalar_one()
    item_responses = []
    for item in order.items:
        dish_result = await db.execute(select(Dish).where(Dish.id == item.dish_id))
        dish = dish_result.scalar_one_or_none()
        item_responses.append(OrderItemResponse(
            id=item.id,
            dish_id=item.dish_id,
            dish_name=dish.name if dish else f"菜品#{item.dish_id}",
            quantity=item.quantity,
            special_notes=item.special_notes,
        ))
    return OrderDetailResponse(
        id=order.id,
        order_no=order.order_no,
        user_id=order.user_id,
        status=order.status,
        chef_id=order.chef_id,
        notes=order.notes,
        items=item_responses,
        created_at=order.created_at,
        completed_at=order.completed_at,
    )


@router.post("", response_model=OrderDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """创建订单"""
    if not order_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="订单不能为空",
        )

    try:
        order = await order_service.create_order(db, order_data, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    await db.commit()
    
    return await build_order_detail(db, order)


@router.get("", response_model=PageResponse[OrderListResponse])
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="订单状态筛选"),
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """订单列表"""
    from app.utils.pagination import PaginationParams

    params = PaginationParams(page=page, page_size=page_size)

    # 普通用户只能查看自己的订单，厨师/管理员可查看所有
    user_id = current_user.id if current_user.role == "user" else None
    chef_id = current_user.id if current_user.role == "chef" else None

    orders, total = await order_service.list_orders(
        db,
        params,
        user_id=user_id,
        chef_id=chef_id,
        status=status,
    )

    list_items = []
    for o in orders:
        item_responses = []
        for item in o.items:
            dish_result = await db.execute(select(Dish).where(Dish.id == item.dish_id))
            dish = dish_result.scalar_one_or_none()
            item_responses.append(OrderItemResponse(
                id=item.id,
                dish_id=item.dish_id,
                dish_name=dish.name if dish else f"菜品#{item.dish_id}",
                quantity=item.quantity,
                special_notes=item.special_notes,
            ))
        list_items.append(OrderListResponse(
            id=o.id,
            order_no=o.order_no,
            status=o.status,
            items=item_responses,
            created_at=o.created_at,
        ))

    return PageResponse[OrderListResponse](
        total=total,
        page=page,
        page_size=page_size,
        items=list_items,
    )


@router.get("/{order_id}", response_model=OrderDetailResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """订单详情"""
    order = await order_service.get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="订单不存在",
        )

    # 权限检查：用户只能查看自己的订单
    if current_user.role == "user" and order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此订单",
        )

    return await build_order_detail(db, order)


@router.put("/{order_id}/status", response_model=OrderDetailResponse)
async def update_order_status(
    order_id: int,
    status_data: OrderStatusUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ["chef", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，仅厨师和管理员可更新订单状态",
        )

    try:
        order = await order_service.update_order_status(
            db, order_id, status_data.status
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="订单不存在",
        )

    await db.commit()
    
    return await build_order_detail(db, order)


@router.delete("/{order_id}", response_model=OrderDetailResponse)
async def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_db),
):
    """取消订单"""
    try:
        order = await order_service.cancel_order(db, order_id, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="订单不存在",
        )
    await db.commit()
    await log_action(current_user.id, "create_order", "order", order.id, f"创建订单 #{order.id}")
    
    return await build_order_detail(db, order)
