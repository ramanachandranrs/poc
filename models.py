from datetime import date
from typing import List, Optional
from sqlalchemy import create_engine, ForeignKey, String, Integer, Float, Date
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, Session
from pydantic import BaseModel, ConfigDict

# SQLite Database Setup
DATABASE_URL = "sqlite:///dealer_network.db"
engine = create_engine(DATABASE_URL, echo=False)

class Base(DeclarativeBase):
    pass

# ---- Wipro DMS SQLAlchemy Models ----

class Dealer(Base):
    __tablename__ = "dealers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    location: Mapped[str] = mapped_column(String(100))
    capacity: Mapped[int] = mapped_column(Integer)

    vehicles: Mapped[List["InventoryVehicle"]] = relationship(back_populates="dealer")
    bookings: Mapped[List["CustomerBooking"]] = relationship(back_populates="dealer")
    parts: Mapped[List["InventoryPart"]] = relationship(back_populates="dealer")
    shipments: Mapped[List["Shipment"]] = relationship(back_populates="destination_dealer")


class InventoryVehicle(Base):
    __tablename__ = "inventory_vehicles"
    vin: Mapped[str] = mapped_column(String(50), primary_key=True)
    dealer_id: Mapped[int] = mapped_column(ForeignKey("dealers.id"))
    model: Mapped[str] = mapped_column(String(50))
    variant: Mapped[str] = mapped_column(String(50))
    color: Mapped[str] = mapped_column(String(30))
    days_in_inventory: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20))

    dealer: Mapped["Dealer"] = relationship(back_populates="vehicles")


class CustomerBooking(Base):
    __tablename__ = "customer_bookings"
    booking_id: Mapped[int] = mapped_column(primary_key=True)
    dealer_id: Mapped[int] = mapped_column(ForeignKey("dealers.id"))
    requested_model: Mapped[str] = mapped_column(String(50))
    requested_variant: Mapped[str] = mapped_column(String(50))
    date_booked: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20))

    dealer: Mapped["Dealer"] = relationship(back_populates="bookings")


# ---- SAP B1 SQLAlchemy Models ----

class SparePart(Base):
    __tablename__ = "spare_parts"
    sku: Mapped[str] = mapped_column(String(50), primary_key=True)
    part_name: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(50))
    unit_cost: Mapped[float] = mapped_column(Float)

    inventory_items: Mapped[List["InventoryPart"]] = relationship(back_populates="part")


class InventoryPart(Base):
    __tablename__ = "inventory_parts"
    id: Mapped[int] = mapped_column(primary_key=True)
    dealer_id: Mapped[int] = mapped_column(ForeignKey("dealers.id"))
    sku: Mapped[str] = mapped_column(ForeignKey("spare_parts.sku"))
    quantity_on_hand: Mapped[int] = mapped_column(Integer)
    floorplan_interest_rate: Mapped[float] = mapped_column(Float)

    dealer: Mapped["Dealer"] = relationship(back_populates="parts")
    part: Mapped["SparePart"] = relationship(back_populates="inventory_items")


# ---- Rail Transit (Manesar) SQLAlchemy Models ----

class Shipment(Base):
    __tablename__ = "shipments"
    shipment_id: Mapped[int] = mapped_column(primary_key=True)
    vin: Mapped[str] = mapped_column(String(50)) 
    origin: Mapped[str] = mapped_column(String(100))
    destination_dealer_id: Mapped[int] = mapped_column(ForeignKey("dealers.id"))
    status: Mapped[str] = mapped_column(String(20))
    expected_delivery_date: Mapped[date] = mapped_column(Date)

    destination_dealer: Mapped["Dealer"] = relationship(back_populates="shipments")


# ---- Pydantic Schemas (v2) ----

class DealerSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    location: str
    capacity: int

class InventoryVehicleSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    vin: str
    dealer_id: int
    model: str
    variant: str
    color: str
    days_in_inventory: int
    status: str

class CustomerBookingSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    booking_id: int
    dealer_id: int
    requested_model: str
    requested_variant: str
    date_booked: date
    status: str

class SparePartSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    sku: str
    part_name: str
    category: str
    unit_cost: float

class InventoryPartSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dealer_id: int
    sku: str
    quantity_on_hand: int
    floorplan_interest_rate: float

class ShipmentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    shipment_id: int
    vin: str
    origin: str
    destination_dealer_id: int
    status: str
    expected_delivery_date: date

# Script to create the tables
if __name__ == "__main__":
    Base.metadata.create_all(engine)
    print("Database tables created successfully.")
