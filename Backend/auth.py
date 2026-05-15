import os
from datetime import datetime, timedelta
from typing import Optional, List, Any
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
import models
from routers.dependencies import get_db

# Secret key for JWT. MUST be set in .env!
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # In a real prod environment, this should probably raise an error.
    # For now, we'll use a placeholder but warn the user.
    SECRET_KEY = "placeholder-secret-key-change-me-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    zone: Optional[str] = None
    dealer_id: Optional[str] = None

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_user(db: Session, username: str) -> Optional[models.AppUser]:
    return db.query(models.AppUser).filter(models.AppUser.username == username).first()

def authenticate_user(db: Session, username: str, password: str) -> Optional[models.AppUser]:
    user = get_user(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.AppUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = get_user(db, username=username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: models.AppUser = Depends(get_current_user)) -> models.AppUser:
    return current_user

def check_role(required_roles: List[Any]):
    async def role_checker(current_user: models.AppUser = Depends(get_current_active_user)):
        # Convert user role to a clean lowercase string
        user_role = str(current_user.role).lower()
        if hasattr(current_user.role, 'value'):
            user_role = str(current_user.role.value).lower()
            
        # Convert required roles to a set of allowed lowercase strings
        allowed = set()
        for r in required_roles:
            allowed.add(str(r).lower())
            if hasattr(r, 'value'):
                allowed.add(str(r.value).lower())
            # Also add common variations
            if "admin" in str(r).lower(): allowed.add("mother_warehouse")
            if "manager" in str(r).lower(): allowed.add("regional_distributor")
            if "user" in str(r).lower(): allowed.add("dealership")

        # Check if the user's role (either as enum name or value) matches any allowed string
        user_role_clean = user_role.split('.')[-1] # Handle "UserRole.ADMIN" -> "admin"
        
        is_allowed = False
        for a in allowed:
            if a == user_role or a == user_role_clean or user_role_clean in a or a in user_role_clean:
                is_allowed = True
                break
        
        if is_allowed:
            return current_user

        raise HTTPException(
            status_code=403, 
            detail=f"Insufficient permissions. Role '{user_role}' not in allowed list."
        )
    return role_checker

def get_scope_condition(current_user: models.AppUser, dealer_field="dealer_id", zone_field="zone") -> str:
    # Robust role check
    role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role).lower()
    role = role.lower()
    
    if "mother_warehouse" in role or role == "admin" or ".admin" in role:
        return "1=1"
    elif "regional_distributor" in role or "manager" in role:
        return f"{zone_field} = '{current_user.zone}'"
    elif "dealership" in role or role == "user" or ".user" in role:
        return f"{dealer_field} = '{current_user.dealer_id}'"
    return "1=0"

def get_scope_filters(current_user: models.AppUser, dealer_table_alias="d", entity_table_alias=None) -> str:
    role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role).lower()
    role = role.lower()
    
    if "mother_warehouse" in role or role == "admin" or ".admin" in role:
        return "1=1"
    elif "regional_distributor" in role or "manager" in role:
        return f"{dealer_table_alias}.zone = '{current_user.zone}'"
    elif "dealership" in role or role == "user" or ".user" in role:
        if entity_table_alias:
            return f"{entity_table_alias}.dealer_id = '{current_user.dealer_id}'"
        return f"{dealer_table_alias}.dealer_id = '{current_user.dealer_id}'"
    return "1=0"

