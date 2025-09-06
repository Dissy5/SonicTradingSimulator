import sqlite3
from data import CHARACTER_SKINS

DB_PATH = "skins.db"


def get_connection():
    return sqlite3.connect(DB_PATH)


def setup_database():
    conn = get_connection()
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
    )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS skins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER,
            name TEXT,
            rarity TEXT,
            image_path TEXT,
            FOREIGN KEY(character_id) REFERENCES characters(id),
            UNIQUE(character_id, name, rarity)
        )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        skin_id INTEGER,
        price INTEGER,
        star INTEGER,
        FOREIGN KEY(character_id) REFERENCES characters(id),
        FOREIGN KEY(skin_id) REFERENCES skins(id)
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shop (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        skin_id INTEGER NOT NULL,
        star INTEGER NOT NULL,
        price INTEGER NOT NULL,
        FOREIGN KEY(character_id) REFERENCES characters(id),
        FOREIGN KEY(skin_id) REFERENCES skins(id)
    )
    """)

    for char_name, skins in CHARACTER_SKINS.items():
        # Insert character (if not exists)
        cursor.execute("INSERT OR IGNORE INTO characters (name) VALUES (?)", (char_name,))

        # Get the character ID
        char_id = cursor.execute("SELECT id FROM characters WHERE name=?", (char_name,)).fetchone()[0]

        # Insert all skins for that character
        for skin_name, rarity, image_path in skins:
            cursor.execute(
                "INSERT OR IGNORE INTO skins (character_id, name, rarity, image_path) VALUES (?, ?, ?, ?)",
                (char_id, skin_name, rarity, image_path)
            )

    conn.commit()
    conn.close()


def delete_shop_entry(conn, entry_id):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM shop WHERE id = ?", (entry_id,))
    conn.commit()


def delete_all_shop_entries(conn):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM shop")
    conn.commit()


def add_shop_entry(conn, character_name, skin_name, rarity, star, price):
    """
    Adds a new entry to the shop table.
    Limits shop to 12 entries total.
    """
    cursor = conn.cursor()

    # Check current shop count
    cursor.execute("SELECT COUNT(*) FROM shop")
    count = cursor.fetchone()[0]
    if count >= 12:
        raise ValueError("Shop already has 12 entries. Cannot add more.")

    # Get the character_id
    cursor.execute("SELECT id FROM characters WHERE name = ?", (character_name,))
    char_result = cursor.fetchone()
    if not char_result:
        raise ValueError(f"Character '{character_name}' not found")
    character_id = char_result[0]

    # Get the skin_id
    cursor.execute("""
        SELECT id FROM skins
        WHERE character_id = ? AND name = ? AND rarity = ?
    """, (character_id, skin_name, rarity))
    skin_result = cursor.fetchone()
    if not skin_result:
        raise ValueError(f"Skin '{skin_name}' with rarity '{rarity}' not found")
    skin_id = skin_result[0]

    # Insert shop entry
    try:
        cursor.execute("""
            INSERT INTO shop (character_id, skin_id, star, price)
            VALUES (?, ?, ?, ?)
        """, (character_id, skin_id, star, price))
        conn.commit()
    except Exception as e:
        print("Error inserting shop entry:", e)
        raise


def get_all_shop_entries(conn):
    cursor = conn.cursor()
    cursor.execute("""
            SELECT 
                shop.id,
                characters.name AS character_name,
                skins.name AS skin_name,
                skins.rarity,
                shop.star,
                shop.price,
                skins.image_path
            FROM shop
            JOIN characters ON shop.character_id = characters.id
            JOIN skins ON shop.skin_id = skins.id
            ORDER BY shop.id ASC
        """)
    return cursor.fetchall()


def add_sale(conn, character_name, skin_name, rarity, star, price):
    cursor = conn.cursor()

    # Get the character_id
    cursor.execute("SELECT id FROM characters WHERE name = ?", (character_name,))
    char_result = cursor.fetchone()
    if not char_result:
        raise ValueError(f"Character '{character_name}' not found")
    character_id = char_result[0]

    # Get the skin_id
    cursor.execute("""
        SELECT id FROM skins
        WHERE character_id = ? AND name = ? AND rarity = ?
    """, (character_id, skin_name, rarity))
    skin_result = cursor.fetchone()
    if not skin_result:
        raise ValueError(f"Skin '{skin_name}' with rarity '{rarity}' not found")
    skin_id = skin_result[0]

    # Insert sale using character_id, skin_id, star, and price
    try:
        cursor.execute("""
            INSERT INTO sales (character_id, skin_id, star, price)
            VALUES (?, ?, ?, ?)
        """, (character_id, skin_id, star, price))
        conn.commit()
    except Exception as e:
        print("Error inserting sale:", e)
        raise


def delete_sale(conn, sale_id):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sales WHERE id = ?", (sale_id,))
    conn.commit()


def get_all_sales(conn):
    cursor = conn.cursor()
    cursor.execute("""
            SELECT sales.id, characters.name, skins.name, skins.rarity, sales.star, sales.price
            FROM sales
            JOIN characters ON sales.character_id = characters.id
            JOIN skins ON sales.skin_id = skins.id
            ORDER BY sales.id DESC
        """)
    return cursor.fetchall()


def get_price_average(conn, character_name, skin_name, rarity, star):
    cursor = conn.cursor()
    cursor.execute("""
            SELECT AVG(price)
            FROM sales
            JOIN skins ON sales.skin_id = skins.id
            JOIN characters ON sales.character_id = characters.id
            WHERE characters.name = ? AND skins.name = ? AND skins.rarity = ? AND sales.star = ?
        """, (character_name, skin_name, rarity, star))
    avg = cursor.fetchone()[0]

    if avg is None:
        return None
    else:
        return avg


def get_all_skin_price_averages(conn):
    cursor = conn.cursor()
    cursor.execute("""
            SELECT characters.name, skins.name, skins.rarity, AVG(sales.price) as avg_price
            FROM sales
            JOIN skins ON sales.skin_id = skins.id
            JOIN characters ON sales.character_id = characters.id
            WHERE sales.star BETWEEN 1 AND 5
            GROUP BY characters.name, skins.name, skins.rarity
        """)
    return cursor.fetchall()


def get_characters(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM characters")
    return [row[0] for row in cursor.fetchall()]


def get_skins_for_character(conn, character_name):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT skins.name 
        FROM skins
        JOIN characters ON skins.character_id = characters.id
        WHERE characters.name = ?
        ORDER BY skins.name
    """, (character_name,))
    return [row[0] for row in cursor.fetchall()]


def get_rarities_for_skin(conn, character_name, skin_name):
    cursor = conn.cursor()
    cursor.execute("""
            SELECT rarity 
            FROM skins
            JOIN characters ON skins.character_id = characters.id
            WHERE characters.name = ? AND skins.name = ?
            ORDER BY rarity
        """, (character_name, skin_name))
    return [row[0] for row in cursor.fetchall()]


def get_image_path_for_skin(conn, character_name, skin_name, rarity):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT image_path
        FROM skins
        JOIN characters ON skins.character_id = characters.id
        WHERE characters.name = ? AND skins.name = ? AND skins.rarity = ?
    """, (character_name, skin_name, rarity))
    result = cursor.fetchone()
    if result:
        return result[0]  # just the string path
    return None
