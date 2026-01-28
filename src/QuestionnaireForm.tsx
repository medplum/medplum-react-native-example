import { Questionnaire, QuestionnaireItem, QuestionnaireResponseItemAnswer, Reference } from '@medplum/fhirtypes';
import {
  isQuestionEnabled,
  QuestionnaireFormState,
  QuestionnaireItemType,
  useQuestionnaireForm,
  useMedplum,
} from '@medplum/react-hooks';
import { JSX, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface QuestionnaireFormProps {
  questionnaire: Questionnaire | Reference<Questionnaire>;
  onSubmit?: (response: any) => void;
}

export default function QuestionnaireForm({ questionnaire, onSubmit }: QuestionnaireFormProps): JSX.Element {
  const medplum = useMedplum();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const state = useQuestionnaireForm({
    questionnaire,
  });

  if (state.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading questionnaire...</Text>
      </View>
    );
  }

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      const response = await medplum.createResource(state.questionnaireResponse);
      setSubmitted(true);
      onSubmit?.(response);
    } catch (error) {
      console.error('Failed to submit questionnaire response:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.submittedContainer}>
        <Text style={styles.submittedText}>✓ Questionnaire submitted successfully!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{state.questionnaire.title || 'Questionnaire'}</Text>
      {state.questionnaire.description && (
        <Text style={styles.description}>{state.questionnaire.description}</Text>
      )}
      <View style={styles.itemsContainer}>
        {state.items.map((item, index) => (
          <QuestionnaireItemComponent
            key={item.linkId}
            item={item}
            state={state}
            responseItems={state.responseItems}
            index={index}
          />
        ))}
      </View>
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

interface QuestionnaireItemComponentProps {
  item: QuestionnaireItem;
  state: Exclude<QuestionnaireFormState, { loading: true }>;
  responseItems: any[];
  index: number;
}

function QuestionnaireItemComponent({
  item,
  state,
  responseItems,
  index,
}: QuestionnaireItemComponentProps): JSX.Element | null {
  if (!isQuestionEnabled(item, state.questionnaireResponse)) {
    return null;
  }

  const responseItem = responseItems[index];

  if (item.type === QuestionnaireItemType.group) {
    return (
      <View style={styles.groupContainer}>
        <Text style={styles.groupTitle}>{item.text}</Text>
        {item.item?.map((childItem, childIndex) => (
          <QuestionnaireItemComponent
            key={childItem.linkId}
            item={childItem}
            state={state}
            responseItems={responseItem?.item || []}
            index={childIndex}
          />
        ))}
      </View>
    );
  }

  if (item.type === QuestionnaireItemType.display) {
    return (
      <View style={styles.displayContainer}>
        <Text style={styles.displayText}>{item.text}</Text>
      </View>
    );
  }

  return (
    <View style={styles.questionContainer}>
      <Text style={styles.questionText}>
        {item.text}
        {item.required && <Text style={styles.required}> *</Text>}
      </Text>
      <QuestionInput
        item={item}
        state={state}
        responseItems={responseItems}
        responseItem={responseItem}
      />
    </View>
  );
}

interface QuestionInputProps {
  item: QuestionnaireItem;
  state: Exclude<QuestionnaireFormState, { loading: true }>;
  responseItems: any[];
  responseItem: any;
}

function QuestionInput({ item, state, responseItems, responseItem }: QuestionInputProps): JSX.Element {
  const currentAnswer = responseItem?.answer?.[0];

  const handleChange = (answer: QuestionnaireResponseItemAnswer[]): void => {
    state.onChangeAnswer(responseItems, item, answer);
  };

  switch (item.type) {
    case QuestionnaireItemType.boolean:
      return (
        <View style={styles.booleanContainer}>
          <Switch
            value={currentAnswer?.valueBoolean ?? false}
            onValueChange={(value) => handleChange([{ valueBoolean: value }])}
          />
        </View>
      );

    case QuestionnaireItemType.decimal:
      return (
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={currentAnswer?.valueDecimal?.toString() ?? ''}
          onChangeText={(text) => {
            const num = parseFloat(text);
            if (!isNaN(num)) {
              handleChange([{ valueDecimal: num }]);
            } else if (text === '') {
              handleChange([]);
            }
          }}
          placeholder="Enter a number"
          placeholderTextColor="#999"
        />
      );

    case QuestionnaireItemType.integer:
      return (
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={currentAnswer?.valueInteger?.toString() ?? ''}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            if (!isNaN(num)) {
              handleChange([{ valueInteger: num }]);
            } else if (text === '') {
              handleChange([]);
            }
          }}
          placeholder="Enter a whole number"
          placeholderTextColor="#999"
        />
      );

    case QuestionnaireItemType.date:
      return (
        <TextInput
          style={styles.input}
          value={currentAnswer?.valueDate ?? ''}
          onChangeText={(text) => handleChange([{ valueDate: text }])}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
        />
      );

    case QuestionnaireItemType.dateTime:
      return (
        <TextInput
          style={styles.input}
          value={currentAnswer?.valueDateTime ?? ''}
          onChangeText={(text) => handleChange([{ valueDateTime: text }])}
          placeholder="YYYY-MM-DDTHH:MM:SS"
          placeholderTextColor="#999"
        />
      );

    case QuestionnaireItemType.time:
      return (
        <TextInput
          style={styles.input}
          value={currentAnswer?.valueTime ?? ''}
          onChangeText={(text) => handleChange([{ valueTime: text }])}
          placeholder="HH:MM:SS"
          placeholderTextColor="#999"
        />
      );

    case QuestionnaireItemType.string:
      return (
        <TextInput
          style={styles.input}
          value={currentAnswer?.valueString ?? ''}
          onChangeText={(text) => handleChange([{ valueString: text }])}
          placeholder="Enter text"
          placeholderTextColor="#999"
        />
      );

    case QuestionnaireItemType.text:
      return (
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={4}
          value={currentAnswer?.valueString ?? ''}
          onChangeText={(text) => handleChange([{ valueString: text }])}
          placeholder="Enter text"
          placeholderTextColor="#999"
        />
      );

    case QuestionnaireItemType.url:
      return (
        <TextInput
          style={styles.input}
          keyboardType="url"
          autoCapitalize="none"
          value={currentAnswer?.valueUri ?? ''}
          onChangeText={(text) => handleChange([{ valueUri: text }])}
          placeholder="https://example.com"
          placeholderTextColor="#999"
        />
      );

    case QuestionnaireItemType.choice:
    case QuestionnaireItemType.openChoice:
      return (
        <ChoiceInput
          item={item}
          currentAnswer={currentAnswer}
          onChangeAnswer={handleChange}
        />
      );

    default:
      return (
        <TextInput
          style={styles.input}
          value={currentAnswer?.valueString ?? ''}
          onChangeText={(text) => handleChange([{ valueString: text }])}
          placeholder="Enter value"
          placeholderTextColor="#999"
        />
      );
  }
}

interface ChoiceInputProps {
  item: QuestionnaireItem;
  currentAnswer: QuestionnaireResponseItemAnswer | undefined;
  onChangeAnswer: (answer: QuestionnaireResponseItemAnswer[]) => void;
}

function ChoiceInput({ item, currentAnswer, onChangeAnswer }: ChoiceInputProps): JSX.Element {
  const options = item.answerOption || [];

  const getOptionValue = (option: any): string => {
    if (option.valueCoding) {
      return option.valueCoding.code || '';
    }
    if (option.valueString) {
      return option.valueString;
    }
    if (option.valueInteger !== undefined) {
      return option.valueInteger.toString();
    }
    return '';
  };

  const getOptionLabel = (option: any): string => {
    if (option.valueCoding) {
      return option.valueCoding.display || option.valueCoding.code || '';
    }
    if (option.valueString) {
      return option.valueString;
    }
    if (option.valueInteger !== undefined) {
      return option.valueInteger.toString();
    }
    return '';
  };

  const isSelected = (option: any): boolean => {
    if (!currentAnswer) return false;
    if (option.valueCoding && currentAnswer.valueCoding) {
      return option.valueCoding.code === currentAnswer.valueCoding.code;
    }
    if (option.valueString && currentAnswer.valueString) {
      return option.valueString === currentAnswer.valueString;
    }
    if (option.valueInteger !== undefined && currentAnswer.valueInteger !== undefined) {
      return option.valueInteger === currentAnswer.valueInteger;
    }
    return false;
  };

  const handleSelect = (option: any): void => {
    if (option.valueCoding) {
      onChangeAnswer([{ valueCoding: option.valueCoding }]);
    } else if (option.valueString) {
      onChangeAnswer([{ valueString: option.valueString }]);
    } else if (option.valueInteger !== undefined) {
      onChangeAnswer([{ valueInteger: option.valueInteger }]);
    }
  };

  return (
    <View style={styles.choiceContainer}>
      {options.map((option, index) => (
        <TouchableOpacity
          key={getOptionValue(option) || index}
          style={[styles.choiceOption, isSelected(option) && styles.choiceOptionSelected]}
          onPress={() => handleSelect(option)}
        >
          <View style={[styles.radioOuter, isSelected(option) && styles.radioOuterSelected]}>
            {isSelected(option) && <View style={styles.radioInner} />}
          </View>
          <Text style={[styles.choiceText, isSelected(option) && styles.choiceTextSelected]}>
            {getOptionLabel(option)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  submittedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  submittedText: {
    fontSize: 18,
    color: '#28a745',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#212529',
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  itemsContainer: {
    marginBottom: 20,
  },
  groupContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#495057',
  },
  displayContainer: {
    marginBottom: 12,
  },
  displayText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  questionContainer: {
    marginBottom: 16,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    color: '#212529',
  },
  required: {
    color: '#dc3545',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#212529',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  booleanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  choiceContainer: {
    gap: 8,
  },
  choiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  choiceOptionSelected: {
    borderColor: '#0066cc',
    backgroundColor: '#e7f1ff',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ced4da',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#0066cc',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0066cc',
  },
  choiceText: {
    fontSize: 15,
    color: '#212529',
  },
  choiceTextSelected: {
    color: '#0066cc',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#99c2e8',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
