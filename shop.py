import os
import sys

from PyQt6.QtCore import Qt
from PyQt6.QtGui import QPixmap
from functools import partial

from PyQt6.QtWidgets import QApplication

import database as db


def format_price(value):
    if value >= 1_000_000:
        return f"{value / 1_000_000:.2f}M".rstrip("0").rstrip(".")
    elif value >= 10_000:
        return f"{value / 1_000:.1f}K".rstrip("0").rstrip(".")
    else:
        return str(int(value))


def resource_path(relative_path):
    # Get absolute path to resource
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


class ShopManager:
    def __init__(self, conn, main_window):
        self.conn = conn
        self.app = main_window
        self.slots = self.gather_slots()

        self.app.clearShopButton.clicked.connect(self.clear_shop)
        self.app.copyShopToClipboard.clicked.connect(self.copy_shop_to_clipboard)

    def copy_shop_to_clipboard(self):
        # Hide delete buttons temporarily
        delete_buttons = []
        for i in range(1, 13):
            btn = getattr(self.app, f"shop{i}Delete", None)
            if btn:
                delete_buttons.append(btn)
                btn.setVisible(False)

        # Grab the shop widget as a pixmap
        shop_pixmap = self.app.shopWidget.grab()  # assuming your shop is inside self.app.shopWidget

        self.populate()

        # Copy to clipboard
        clipboard = QApplication.clipboard()
        clipboard.setPixmap(shop_pixmap)

    def clear_shop(self):
        db.delete_all_shop_entries(self.conn)
        self.populate()

    def delete_slot(self, entry_id):
        db.delete_shop_entry(self.conn, entry_id)
        self.populate()
        print("Entry id:", entry_id)

    def gather_slots(self):
        """Cache references to the shop image/price widgets."""
        slots = []
        for i in range(1, 13):  # 1 → 12
            image_widget = getattr(self.app, f"shop{i}Image", None)
            price_widget = getattr(self.app, f"shop{i}PriceLabel", None)
            if image_widget and price_widget:
                slots.append((image_widget, price_widget))
        return slots

    def populate(self):
        entries = db.get_all_shop_entries(self.conn)

        # Enable/disable add button
        self.app.addToShopButton.setEnabled(len(entries) < 12)

        for slot_number in range(1, 13):
            # Get references to widgets
            image_widget = getattr(self.app, f"shop{slot_number}Image", None)
            price_widget = getattr(self.app, f"shop{slot_number}PriceLabel", None)
            star_label = getattr(self.app, f"shop{slot_number}StarLabel", None)
            star_icon = getattr(self.app, f"shop{slot_number}StarIcon", None)
            delete_button = getattr(self.app, f"shop{slot_number}Delete", None)
            ring_icon = getattr(self.app, f"shop{slot_number}RingIcon", None)

            if slot_number <= len(entries):
                entry_id, character_name, skin_name, rarity, star, price, image_path = entries[slot_number - 1]

                pixmap = QPixmap(resource_path(image_path))
                if not pixmap.isNull():
                    image_widget.setPixmap(
                        pixmap.scaled(
                            image_widget.width(),
                            image_widget.height(),
                            Qt.AspectRatioMode.KeepAspectRatio,
                            Qt.TransformationMode.SmoothTransformation
                        )
                    )
                price_widget.setText(str(format_price(price)))

                star_label.setText(str(star))
                star_label.setVisible(True)

                # Set star icon
                if star_icon:
                    icon_pixmap = QPixmap(resource_path("images/star.png"))
                    if not icon_pixmap.isNull():
                        star_icon.setPixmap(
                            icon_pixmap.scaled(
                                star_icon.width(),
                                star_icon.height(),
                                Qt.AspectRatioMode.KeepAspectRatio,
                                Qt.TransformationMode.SmoothTransformation
                            )
                        )
                    star_icon.setVisible(True)

                    # Set ring icon
                    if ring_icon:
                        icon_pixmap = QPixmap(resource_path("images/ring.png"))
                        if not icon_pixmap.isNull():
                            ring_icon.setPixmap(
                                icon_pixmap.scaled(
                                    ring_icon.width(),
                                    ring_icon.height(),
                                    Qt.AspectRatioMode.KeepAspectRatio,
                                    Qt.TransformationMode.SmoothTransformation
                                )
                            )
                        ring_icon.setVisible(True)

                # Show and enable delete button
                try:
                    delete_button.clicked.disconnect()
                except TypeError:
                    pass
                delete_button.clicked.connect(partial(self.delete_slot, entry_id))
                delete_button.setVisible(True)
                delete_button.setEnabled(True)
            else:
                # Empty slot: clear and hide button
                image_widget.clear()
                price_widget.setText("")
                delete_button.entry_id = None
                delete_button.setVisible(False)
                delete_button.setEnabled(False)
                star_label.clear()
                star_label.setVisible(False)
                if star_icon:
                    star_icon.clear()
                    star_icon.setVisible(False)
                if ring_icon:
                    ring_icon.clear()
                    ring_icon.setVisible(False)

