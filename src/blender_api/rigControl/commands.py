# Implements the commands defined by the public API
import bpy
from  mathutils import Matrix
from math import pi
from collections import OrderedDict

from rigAPI.rigAPI import RigAPI

# ====================================================

def init():
    bpy.ops.wm.animation_playback()
    return 0

def getEnvironment():
    return None

def terminate():
    return 0


class EvaAPI(RigAPI):

    def __init__(self):
        pass

    # System control and information commands ===========
    def getAPIVersion(self):
        return 4

    def isAlive(self):
        return int(bpy.context.scene['animationPlaybackActive'])

    # Somatic states  --------------------------------
    # awake, asleep, drunk, dazed and confused ...
    def availableSomaStates(self):
        somaStates = []
        for state in bpy.data.actions:
            if state.name.startswith("CYC-"):
                somaStates.append(state.name[4:])
        return somaStates

    def getSomaStates(self):
        eva = bpy.evaAnimationManager
        somaStates = {}
        for cycle in eva.cyclesSet:
            magnitude = round(cycle.magnitude, 3)
            rate = round(cycle.rate, 3)
            ease_in = round(cycle.ease_in, 3)
            somaStates[cycle.name] = {'magnitude': magnitude, 'rate': rate,
                'ease_in': ease_in}
        return somaStates

    def setSomaState(self, state):
        name = 'CYC-' + state['name']
        rate = state['rate']
        magnitude = state['magnitude']
        ease_in = state['ease_in']
        bpy.evaAnimationManager.setCycle(name=name,
            rate=rate, magnitude=magnitude, ease_in=ease_in)
        return 0

    # Emotion expressions ----------------------------
    # smiling, frowning, bored ...
    def availableEmotionStates(self):
        emotionStates = []
        for emo in bpy.data.objects['control'].pose.bones:
            if emo.name.startswith('EMO-'):
                emotionStates.append(emo.name[4:])
        return emotionStates


    def getEmotionStates(self):
        eva = bpy.evaAnimationManager
        emotionStates = {}
        for emotion in eva.emotionsList:
            magnitude = round(emotion.magnitude.current, 3)
            duration = round(emotion.duration, 3)
            emotionStates[emotion.name] = {'magnitude': magnitude, 'duration': duration}
        return emotionStates


    def setEmotionState(self, emotion):
        # TODO: expand arguments and update doc
        bpy.evaAnimationManager.setEmotion(eval(emotion))
        return 0


    # Gestures --------------------------------------
    # blinking, nodding, shaking...
    def availableGestures(self):
        emotionGestures = []
        for gesture in bpy.data.actions:
            if gesture.name.startswith("GST-"):
                emotionGestures.append(gesture.name[4:])
        return emotionGestures


    def getGestures(self):
        eva = bpy.evaAnimationManager
        emotionGestures = {}
        for gesture in eva.gesturesList:
            duration = round(gesture.duration*gesture.repeat - gesture.stripRef.strip_time, 3)
            magnitude = round(gesture.magnitude, 3)
            speed = round(gesture.speed, 3)
            emotionGestures[gesture.name] = {'duration': duration, \
                'magnitude': magnitude, 'speed': speed}
        return emotionGestures


    def setGesture(self, name, repeat=1, speed=1, magnitude=1.0):
        bpy.evaAnimationManager.newGesture(name='GST-'+name, \
            repeat=repeat, speed=speed, magnitude=magnitude)
        return 0


    def stopGesture(self, gestureID, smoothing):
        ## TODO
        return 0

    def getGestureParams(self):
        eva = bpy.evaAnimationManager
        return {'eyeDartRate': round(eva.eyeDartRate, 3),
                'eyeWander': round(eva.eyeWander, 3),
                'blinkRate': round(eva.blinkRate, 3),
                'blinkDuration': round(eva.blinkDuration, 3)}


    # Visemes --------------------------------------
    def availableVisemes(self):
        visemes = []
        for viseme in bpy.data.actions:
            if viseme.name.startswith("VIS-"):
                visemes.append(viseme.name[4:])
        return visemes


    def queueViseme(self, vis, start=0, duration=0.5, \
            rampin=0.1, rampout=0.8, magnitude=1):
        return bpy.evaAnimationManager.newViseme("VIS-"+vis, duration, \
            rampin, rampout, start)

    # Eye look-at targets ==========================
    # The coordinate system used is head-relative, in 'engineering'
    # coordinates: 'x' is forward, 'y' to the left, and 'z' up.
    # Distances are measured in meters.  Origin of the coordinate
    # system is somewhere (where?) in the middle of the head.

    def setFaceTarget(self, loc):
        # Eva uses y==forward x==right. Distances in meters from
        # somewhere in the middle of the head.
        mloc = [-loc[1], loc[0], loc[2]]
        bpy.evaAnimationManager.setFaceTarget(mloc)
        return 0

    def setGazeTarget(self, loc):
        mloc = [-loc[1],  loc[0], loc[2]]
        bpy.evaAnimationManager.setGazeTarget(mloc)
        return 0

    # ========== info dump for ROS, Should return non-blender data structures

    # Gets Head rotation quaternion in XYZ format in blender independamt
    # data structure.
    # Pitch: X (positive down, negative up)?
    # Yaw: Z (negative right to positive left)
    #
    # The bones['DEF-head'].id_data.matrix_world currently return the
    # unit matrix, and so are not really needed.

    def getHeadData(self):
        bones = bpy.evaAnimationManager.deformObj.pose.bones
        rhead = bones['DEF-head'].matrix * Matrix.Rotation(-pi/2, 4, 'X')
        rneck = bones['DEF-neck'].matrix * Matrix.Rotation(-pi/2, 4, 'X')
        rneck.invert()

        # I think this is the correct order for the neck rotations.
        q = (rneck * rhead).to_quaternion()
        # q = (rhead * rneck).to_quaternion()
        return {'x':q.x, 'y':q.y, 'z':q.z, 'w':q.w}

    # Same as head, but for the lower neck joint.
    def getNeckData(self):
        bones = bpy.evaAnimationManager.deformObj.pose.bones
        rneck = bones['DEF-neck'].matrix * Matrix.Rotation(-pi/2, 4, 'X')
        q = rneck.to_quaternion()
        return {'x':q.x, 'y':q.y, 'z':q.z, 'w':q.w}

    # Gets Eye rotation angles:
    # Pitch: down(negative) to up(positive)
    # Yaw: left (negative) to right(positive)

    def getEyesData(self):
        bones = bpy.evaAnimationManager.deformObj.pose.bones
        head = (bones['DEF-head'].id_data.matrix_world*bones['DEF-head'].matrix*Matrix.Rotation(-pi/2, 4, 'X')).to_euler()
        leye = bones['eye.L'].matrix.to_euler()
        reye = bones['eye.R'].matrix.to_euler()
        # Relative to head. Head angles are inversed.
        leye_p = leye.x + head.x
        leye_y = pi - leye.z if leye.z >= 0 else -(pi+leye.z)
        reye_p = reye.x + head.x
        reye_y = pi - reye.z if reye.z >= 0 else -(pi+reye.z)
        # Add head target
        leye_y += head.z
        reye_y += head.z
        return {'l':{'p':leye_p,'y':leye_y},'r':{'p':reye_p,'y':reye_y}}


    def getFaceData(self):
        shapekeys = OrderedDict()
        for shapekeyGroup in bpy.data.shape_keys:
            # Hardcoded to find the correct group
            if shapekeyGroup.name == 'Key.007':
                for kb in shapekeyGroup.key_blocks:
                    shapekeys[kb.name] = kb.value

        # Fake the jaw shapekey from its z coordinate
        jawz = bpy.evaAnimationManager.deformObj.pose.bones['chin'].location[2]
        shapekeys['jaw'] = min(max(jawz/0.3, 0), 1)

        return shapekeys
