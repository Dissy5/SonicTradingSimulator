class Character:
    def __init__(self, name):
        self.name = name
        self.skins = []

    def add_skin(self, skin):
        self.skins.append(skin)

    def get_skins(self):
        return [skin.name for skin in self.skins]
