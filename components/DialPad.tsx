import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Delete } from 'lucide-react-native';

interface DialPadProps {
  onKeyPress: (key: string) => void;
}

const DialPad: React.FC<DialPadProps> = ({ onKeyPress }) => {
  const buttons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', '<Backspace'
  ];

  return (
    <View style={styles.dialPad}>
      {buttons.map((button) => (
        <TouchableOpacity
          key={button}
          style={styles.button}
          onPress={() => onKeyPress(button)}
        >
          {button === '<Backspace' ? (
            <Delete size={24} color="#333" />
          ) : (
            <Text style={styles.buttonText}>{button}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  dialPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  button: {
    width: '30%',
    margin: '1.5%',
    aspectRatio: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default DialPad;