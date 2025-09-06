import os
import sqlite3
import sys

from PyQt6.QtCore import Qt, QRect, QPoint
from PyQt6.QtGui import QPixmap, QIcon, QPainter, QColor, QFont, QTextDocument, QImage
from PyQt6.QtWidgets import QMainWindow, QTableWidgetItem, QPushButton, QWidget, QHBoxLayout, QHeaderView, QApplication, \
    QComboBox, QLabel, QSpinBox

import database as db
from mainwindow import Ui_MainWindow
from skinpricetable import PriceTableManager
from shop import ShopManager


def resource_path(relative_path):
    # Get absolute path to resource
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


class MyApp(QMainWindow, Ui_MainWindow):
    def __init__(self):
        super().__init__()
        self.setupUi(self)

        self.setWindowIcon(QIcon(resource_path("images/ring.png")))

        pixmap = QPixmap(resource_path("images/ring.png"))
        self.averageSaleRingIcon.setPixmap(pixmap)
        # connect to DB
        self.conn = sqlite3.connect("skins.db")

        self.priceTableManager = PriceTableManager(self.valueTableWidget, self.conn)
        self.priceTableManager.populate()

        self.shopManager = ShopManager(self.conn, self)

        # populate characters
        characters = db.get_characters(self.conn)
        self.characterComboBox.addItems(characters)
        self.shopCharacterComboBox.addItems(characters)

        # set up listener so skins update when character changes
        self.characterComboBox.currentTextChanged.connect(self.update_skin_combo)
        self.shopCharacterComboBox.currentTextChanged.connect(self.update_shop_skin_combo)

        self.skinComboBox.currentTextChanged.connect(self.update_rarity_combo)
        self.shopSkinComboBox.currentTextChanged.connect(self.update_shop_rarity_combo)

        self.characterComboBox.currentTextChanged.connect(self.update_skin_image)
        self.shopCharacterComboBox.currentTextChanged.connect(self.update_shop_skin_image)

        self.skinComboBox.currentTextChanged.connect(self.update_skin_image)
        self.shopSkinComboBox.currentTextChanged.connect(self.update_shop_skin_image)

        self.rarityComboBox.currentTextChanged.connect(self.update_skin_image)
        self.shopRarityComboBox.currentTextChanged.connect(self.update_shop_skin_image)

        self.saleSubmitButton.clicked.connect(self.submit_sale)

        self.rarityComboBox.currentTextChanged.connect(self.update_average_price_label)
        self.shopRarityComboBox.currentTextChanged.connect(self.update_shop_average_price_label)

        self.starSpinBox.valueChanged.connect(self.update_average_price_label)
        self.shopStarSpinBox.valueChanged.connect(self.update_shop_average_price_label)

        self.copyToClipboardSkinValueTable.clicked.connect(self.copy_table_to_clipboard)

        self.addToShopButton.clicked.connect(self.add_to_shop)
        self.shopManager.populate()

        self.load_sales_log()

        self.update_average_price_label()

        # populate first set of skins right away
        if characters:
            self.update_skin_combo()
            self.update_shop_skin_combo()

    def add_to_shop(self):
        character_name = self.shopCharacterComboBox.currentText()
        skin_name = self.shopSkinComboBox.currentText()
        rarity = self.shopRarityComboBox.currentText()
        star = self.shopStarSpinBox.value()
        price = self.shopPriceSpinBox.value()

        print("Attempting to add to shop")
        db.add_shop_entry(self.conn, character_name, skin_name, rarity, star, price)
        print("Added to shop database")

        self.shopManager.populate()

    def load_sales_log(self):
        rows = db.get_all_sales(self.conn)
        self.salesTableWidget.setRowCount(0)
        self.salesTableWidget.setRowCount(len(rows))
        for row_idx, (sale_id, char_name, skin_name, rarity, star, price) in enumerate(rows):
            self.salesTableWidget.setItem(row_idx, 0, QTableWidgetItem(char_name))
            self.salesTableWidget.setItem(row_idx, 1, QTableWidgetItem(skin_name))
            self.salesTableWidget.setItem(row_idx, 2, QTableWidgetItem(rarity))
            self.salesTableWidget.setItem(row_idx, 3, QTableWidgetItem(str(star)))
            self.salesTableWidget.setItem(row_idx, 4, QTableWidgetItem(str(price)))

            # Create delete button
            btn = QPushButton("Delete")
            btn.clicked.connect(lambda _, sid=sale_id: self.delete_sale(sid))

            # Add button to a QWidget, so it can be embedded in the cell
            cell_widget = QWidget()
            layout = QHBoxLayout()
            layout.addWidget(btn)
            layout.setContentsMargins(0, 0, 0, 0)
            cell_widget.setLayout(layout)
            self.salesTableWidget.setCellWidget(row_idx, 5, cell_widget)

            header = self.salesTableWidget.horizontalHeader()

            # Set the first N-1 columns (all data columns) to stretch
            for col in range(self.salesTableWidget.columnCount() - 1):
                header.setSectionResizeMode(col, QHeaderView.ResizeMode.Stretch)

            # Set the last column (delete buttons) to fixed
            header.setSectionResizeMode(self.salesTableWidget.columnCount() - 1, QHeaderView.ResizeMode.Fixed)
            self.salesTableWidget.setColumnWidth(self.salesTableWidget.columnCount() - 1, 80)

    def copy_table_to_clipboard(self):
        table = self.valueTableWidget
        rows = table.rowCount()
        cols = table.columnCount()
        max_width = 2000
        max_height = 2000
        # Gather sizes
        row_heights = [table.rowHeight(r) for r in range(rows)]
        col_widths = [table.columnWidth(c) for c in range(cols)]
        v_header_width = table.verticalHeader().width()

        total_width = v_header_width + sum(col_widths)
        total_height = sum(row_heights)

        # Limit the size to prevent crashes
        scale_w = min(1.0, max_width / total_width)
        scale_h = min(1.0, max_height / total_height)
        scale = min(scale_w, scale_h)

        final_width = int(total_width * scale)
        final_height = int(total_height * scale)

        pixmap = QPixmap(final_width, final_height)
        pixmap.fill(QColor("white"))
        painter = QPainter(pixmap)
        painter.setFont(QFont("Arial", int(10 * scale)))

        y_offset = 0
        for r in range(rows):
            x_offset = 0
            row_h = int(row_heights[r] * scale)

            # Draw vertical header
            header_text = table.verticalHeaderItem(r).text() if table.verticalHeaderItem(r) else str(r)
            header_w = int(v_header_width * scale)
            header_rect = QRect(x_offset, y_offset, header_w, row_h)
            painter.fillRect(header_rect, QColor("#f0f0f0"))
            painter.drawRect(header_rect)
            painter.drawText(header_rect, Qt.AlignmentFlag.AlignCenter, header_text)
            x_offset += header_w

            # Draw cells
            for c in range(cols):
                col_w = int(col_widths[c] * scale)
                cell_rect = QRect(x_offset, y_offset, col_w, row_h)
                painter.fillRect(cell_rect, QColor("black"))
                painter.drawRect(cell_rect)

                # Draw text
                item = table.item(r, c)
                if item:
                    painter.drawText(cell_rect, Qt.AlignmentFlag.AlignCenter, item.text())

                # Draw widget/image if present
                widget = table.cellWidget(r, c)
                if widget:
                    # Render widget to pixmap and draw scaled to cell
                    w_pixmap = QPixmap(widget.size())
                    widget.render(w_pixmap)
                    painter.drawPixmap(cell_rect, w_pixmap.scaled(cell_rect.size()))

                x_offset += col_w

            y_offset += row_h

        painter.end()
        QApplication.clipboard().setPixmap(pixmap)
        print("Table visual copied to clipboard as image!")

    def submit_sale(self):
        character = self.characterComboBox.currentText()
        skin = self.skinComboBox.currentText()
        rarity = self.rarityComboBox.currentText()
        star = self.starSpinBox.value()
        price = self.priceSpinBox.value()

        if not (character and skin and rarity) or price < 0 or star <= 0:
            return

        db.add_sale(self.conn, character, skin, rarity, star, price)

        # Add to log table
        self.load_sales_log()

        # Reset fields
        self.priceSpinBox.setValue(0)

        self.update_average_price_label()
        self.priceTableManager.populate()

    def update_average_price_label_generic(self, target_character_combo: QComboBox,
                                           target_skin_combo: QComboBox,
                                           target_rarity_combo: QComboBox,
                                           target_star_combo,
                                           target_price_label: QLabel):
        character_name = target_character_combo.currentText()
        skin_name = target_skin_combo.currentText()
        rarity = target_rarity_combo.currentText()
        star = target_star_combo.value()

        if not (character_name and skin_name and rarity):
            self.averagePriceLabel.setText("N/A")
            return

        result = db.get_price_average(self.conn, character_name, skin_name, rarity, star)

        if result is None:
            target_price_label.setText("N/A")
        else:
            target_price_label.setText(f"{int(result)}")

    def update_average_price_label(self):
        self.update_average_price_label_generic(self.characterComboBox, self.skinComboBox, self.rarityComboBox,
                                                self.starSpinBox, self.averagePriceLabel)

    def update_shop_average_price_label(self):
        self.update_average_price_label_generic(self.shopCharacterComboBox, self.shopSkinComboBox,
                                                self.shopRarityComboBox,
                                                self.shopStarSpinBox, self.shopAveragePriceLabel)

    def delete_sale(self, sale_id):
        db.delete_sale(self.conn, sale_id)
        self.load_sales_log()  # refresh the table
        self.update_average_price_label()
        self.priceTableManager.populate()

    def update_skin_combo_generic(self, target_character_combo: QComboBox,
                                  target_skin_combo: QComboBox,
                                  target_rarity_combo: QComboBox,
                                  target_image_label,
                                  target_star_combo: QSpinBox,
                                  target_price_label: QLabel):
        # Clear the target combo boxes
        target_skin_combo.clear()
        target_rarity_combo.clear()

        character_name = target_character_combo.currentText()

        if not character_name:
            return

        # Get skins for character
        skins = db.get_skins_for_character(self.conn, character_name)
        target_skin_combo.addItems(skins)

        # Update rarities for first skin immediately
        if skins:
            self.update_rarity_combo_generic(target_character_combo, target_skin_combo, target_rarity_combo,
                                             target_image_label, target_star_combo, target_price_label)

        # Update images and labels
        self.update_skin_image_generic(target_character_combo, target_skin_combo, target_rarity_combo,
                                       target_image_label)
        self.update_average_price_label_generic(target_character_combo, target_skin_combo, target_rarity_combo,
                                                target_star_combo, target_price_label)

    def update_skin_combo(self):
        self.update_skin_combo_generic(self.characterComboBox, self.skinComboBox, self.rarityComboBox, self.imageLabel,
                                       self.starSpinBox, self.averagePriceLabel)

    def update_shop_skin_combo(self):
        self.update_skin_combo_generic(self.shopCharacterComboBox, self.shopSkinComboBox, self.shopRarityComboBox,
                                       self.shopSkinImage, self.shopStarSpinBox, self.shopAveragePriceLabel)

    def update_rarity_combo_generic(self, target_character_combo: QComboBox,
                                    target_skin_combo: QComboBox,
                                    target_rarity_combo: QComboBox,
                                    target_image_label,
                                    target_star_combo: QSpinBox,
                                    target_price_label: QLabel):
        # Clear the target combo
        target_rarity_combo.clear()
        skin_name = target_skin_combo.currentText()

        character_name = target_character_combo.currentText()
        if not character_name or not skin_name:
            return

        rarities = db.get_rarities_for_skin(self.conn, character_name, skin_name)
        target_rarity_combo.addItems(rarities)

        # Enable/disable based on number of rarities
        target_rarity_combo.setEnabled(len(rarities) > 1)

        # Update images and labels as before
        self.update_skin_image_generic(target_character_combo, target_skin_combo, target_rarity_combo,
                                       target_image_label)
        self.update_average_price_label_generic(target_character_combo, target_skin_combo, target_rarity_combo,
                                                target_star_combo, target_price_label)

    def update_rarity_combo(self):
        self.update_rarity_combo_generic(self.characterComboBox, self.skinComboBox, self.rarityComboBox,
                                         self.imageLabel, self.starSpinBox, self.averagePriceLabel)

    def update_shop_rarity_combo(self):
        self.update_rarity_combo_generic(self.shopCharacterComboBox, self.shopSkinComboBox, self.shopRarityComboBox,
                                         self.shopSkinImage, self.shopStarSpinBox, self.shopAveragePriceLabel)

    def update_skin_image_generic(self,
                                  target_character_combo: QComboBox,
                                  target_skin_combo: QComboBox,
                                  target_rarity_combo: QComboBox,
                                  target_image_label):
        character_name = target_character_combo.currentText()
        skin_name = target_skin_combo.currentText()
        rarity = target_rarity_combo.currentText()

        if not (character_name and skin_name and rarity):
            target_image_label.clear()
            return

        image_path = db.get_image_path_for_skin(self.conn, character_name, skin_name, rarity)
        if not image_path:
            target_image_label.clear()
            return

        pixmap = QPixmap(resource_path(image_path))
        scaled = pixmap.scaled(
            target_image_label.width(),
            target_image_label.height(),
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation
        )
        target_image_label.setPixmap(scaled)

    def update_skin_image(self):
        self.update_skin_image_generic(self.characterComboBox, self.skinComboBox, self.rarityComboBox, self.imageLabel)

    def update_shop_skin_image(self):
        self.update_skin_image_generic(self.shopCharacterComboBox, self.shopSkinComboBox, self.shopRarityComboBox,
                                       self.shopSkinImage)
