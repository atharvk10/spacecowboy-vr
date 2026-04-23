# Space Cowboys Revamp

## 1 	Introduction
This is a first-person shooter (FPS) game inspired by the idea of space cowboys, combining elements of the Wild West with a futuristic outer space setting. The player takes on the role of a cowboy equipped with both a gun and a lasso, allowing for different ways to interact with the environment. The gun is used for shooting targets, while the lasso adds variety by letting the player catch or grab objects. 

The main gameplay focuses on asteroids moving across the screen, which the player must respond to quickly. They can either shoot the asteroids or use the lasso to capture them. Each successful action earns points, making it a score-based game that emphasizes accuracy, timing, and quick reactions.

Using virtual reality (VR) enhances the experience by placing the player in a fully immersive 360-degree environment. Instead of viewing the game on a flat screen, players can look and move around naturally, which makes the gameplay feel more intuitive and engaging.

## 2 	Environment Design
The main theme of the game mixes a space setting with influences from Space Jam - especially the version with LeBron James - and the anime Cowboy Bebop. This gives the game a fun but slightly laid-back vibe, combining colorful, playful energy with a cool space-western feel. The retro futurism style helps bring everything together, using ideas of what people in the past thought the future would look like - like bright colors, glowing tech, and slightly exaggerated designs - while still feeling smooth and modern.

In the environment, asteroids are one of the main elements the player interacts with. They move across the space around you and act as both obstacles and targets, keeping the gameplay active and a bit unpredictable. Along with that, the background imagery helps build the overall atmosphere. Things like stars, planets, and distant galaxies surround the player, making the world feel more complete and immersive. All of these elements work together to create a setting that feels consistent, engaging, and easy to get lost in.

## 3 	Interactions and Features 
The main interactive elements in the game are the gun, the lasso, and the asteroids, each shaping how the player engages with the environment. The gun is the most direct tool, held in the player’s left hand (left joystick), and is used to quickly aim and shoot incoming asteroids. When the player locks onto an asteroid and presses a button, it is destroyed, emphasizing accuracy and fast reactions as objects move across the player’s view.
The lasso, held in the right hand (right joystick), offers a more skill-based interaction. Instead of destroying asteroids, the player can grab and throw them. The speed and distance of each throw depend on how far back the joystick is pulled, giving the player more control and requiring good timing. Realistic movement is supported through physics interactions using Cannon-ES, making the motion feel natural and responsive.
Asteroids are the main objects the player interacts with, acting as both targets and obstacles as they move through the space. They vary in size, adding challenge and variety, and the game includes a point system that rewards players based on how many asteroids they successfully destroy. The experience takes place in a full 360-degree environment, where asteroids spawn all around the player rather than just in front of them. This means the player can physically turn and look in any direction to find targets, grab asteroids, and throw them, making the gameplay feel more immersive and active.
Together, these elements create a simple but engaging gameplay loop that balances quick shooting with more controlled, interactive mechanics in an immersive 360-degree setting.

| Type of Interaction | Category | Brief Description |
| ------------------  | -------- | ----------------- |
|   Physics           | A        | When user throws asteroids, Cannon-ES will be used to achieve proper movement and physics. |
| Multiple Object Types/Modes | A | Users will have a gun and lasso, and the environment will have different object types (stars,planets, etc). | 
| Procedural Generation | A | The scene will update as asteroids move across the user, and when the user throws the asteroids. |
| 360-Degree Environment | B | Users will be immersed in a 360 degree environment for better experience. |


