import os
import sys

from PyQt6.QtWidgets import QTableWidgetItem, QLabel
from PyQt6.QtGui import QPixmap
from PyQt6.QtCore import Qt
import database as db


def resource_path(relative_path):
    # Get absolute path to resource
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


def format_price(value):
    if value >= 1_000_000:
        return f"{value / 1_000_000:.2f}M".rstrip("0").rstrip(".")
    elif value >= 10_000:
        return f"{value / 1_000:.1f}K".rstrip("0").rstrip(".")
    else:
        return str(int(value))


class PriceTableManager:
    def __init__(self, table_widget, conn):
        self.table = table_widget
        self.conn = conn

    def populate(self):
        from database import get_all_skin_price_averages
        price_ranges = [
            (0, 1000),
            (1000, 2000),
            (2000, 3000),
            (3000, 4000),
            (4000, 5000),
            (5000, 6000),
            (6000, 7000),
            (7000, 8000),
            (8000, 9000),
            (9000, 10000),
            (10000, 12000),
            (12000, 15000),
            (15000, 20000),
            (20000, 25000),
            (25000, 30000),
            (30000, 35000),
            (35000, 40000),
            (40000, 50000),
            (50000, 60000),
            (60000, 70000),
            (70000, 80000),
            (80000, 100000),
            (100000, 125000),
            (125000, 150000),
            (150000, 175000),
            (200000, 250000),
            (250000, 300000),
            (300000, 350000),
            (350000, 400000),
            (400000, 500000),
            (500000, 600000),
            (600000, 700000),
            (700000, 800000),
            (900000, 1000000)
        ]

        price_ranges.reverse()

        # Fetch all skin averages
        skin_entries = [entry for entry in get_all_skin_price_averages(self.conn) if entry[3] is not None]

        # Determine which rows actually have skins
        rows_to_populate = {i: [] for i in range(len(price_ranges))}

        for character, skin, rarity, avg_price in skin_entries:
            row_idx = next((i for i, (low, high) in enumerate(price_ranges) if low <= avg_price < high),
                           len(price_ranges) - 1)
            rows_to_populate[row_idx].append((character, skin, rarity))

        # Only keep non-empty rows
        filtered_rows = [(i, price_ranges[i]) for i in range(len(price_ranges)) if rows_to_populate[i]]

        self.table.clearContents()
        self.table.setRowCount(len(filtered_rows))

        # Build vertical header labels
        header_labels = [f"{format_price(low)}-{format_price(high)}" for _, pr in filtered_rows for low, high in [pr]]
        self.table.setVerticalHeaderLabels(header_labels)

        # First pass: determine max columns needed
        max_cols_needed = max(len(rows_to_populate[i]) for i, _ in filtered_rows) if filtered_rows else 1
        self.table.setColumnCount(max_cols_needed)

        # Populate table
        for row_idx, (row_key, _) in enumerate(filtered_rows):
            col_idx_tracker = 0
            for character, skin, rarity in rows_to_populate[row_key]:
                image_path = db.get_image_path_for_skin(self.conn, character, skin, rarity)
                if not image_path:
                    continue

                label = QLabel()
                pixmap = QPixmap(resource_path(image_path))
                scaled = pixmap.scaled(
                    64, 64,
                    Qt.AspectRatioMode.KeepAspectRatio,
                    Qt.TransformationMode.SmoothTransformation
                )
                label.setPixmap(scaled)
                label.setAlignment(Qt.AlignmentFlag.AlignCenter)

                self.table.setCellWidget(row_idx, col_idx_tracker, label)
                col_idx_tracker += 1

        self.table.resizeColumnsToContents()
        self.table.resizeRowsToContents()


