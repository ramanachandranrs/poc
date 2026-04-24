import re

with open(r"c:\Users\RamanachandranRS\Professional\New folder\poc\Backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    """from auth import (
    Token,
    authenticate_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    fake_users_db,
    get_current_active_user,
    User
)""",
    """from auth import (
    Token,
    authenticate_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    get_current_active_user,
    check_role
)"""
)

# 2. Update /token endpoint
old_token_endpoint = """@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}"""

new_token_endpoint = """@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role.value if user.role else None,
            "zone": user.zone,
            "dealer_id": user.dealer_id
        }, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}"""

content = content.replace(old_token_endpoint, new_token_endpoint)

# 3. Add scoping helper at the top
scoping_helper = """
def get_scope_filters(current_user: models.AppUser, dealer_table_alias="d", entity_table_alias=None) -> str:
    if current_user.role == models.UserRole.ADMIN:
        return "1=1"
    elif current_user.role == models.UserRole.MANAGER:
        return f"{dealer_table_alias}.zone = '{current_user.zone}'"
    elif current_user.role == models.UserRole.USER:
        if entity_table_alias:
            return f"{entity_table_alias}.dealer_id = '{current_user.dealer_id}'"
        return f"{dealer_table_alias}.dealer_id = '{current_user.dealer_id}'"
    return "1=0"

def apply_scope_params(params: dict, current_user: models.AppUser):
    pass # No longer needed if we inject direct strings for POC, but let's keep it safe.
    
def get_scope_condition(current_user: models.AppUser, dealer_field="dealer_id", zone_field="zone"):
    if current_user.role == models.UserRole.ADMIN:
        return "1=1"
    elif current_user.role == models.UserRole.MANAGER:
        return f"{zone_field} = '{current_user.zone}'"
    elif current_user.role == models.UserRole.USER:
        return f"{dealer_field} = '{current_user.dealer_id}'"
    return "1=0"
"""
content = content.replace("app = FastAPI(", scoping_helper + "\napp = FastAPI(")

with open(r"c:\Users\RamanachandranRS\Professional\New folder\poc\Backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated main.py setup")
