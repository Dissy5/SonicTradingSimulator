from PyQt6.QtWidgets import QApplication
import database as db
from app import MyApp


if __name__ == "__main__":
    db.setup_database()
    app = QApplication([])
    window = MyApp()
    window.show()
    app.exec()
