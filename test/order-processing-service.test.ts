// import * as cdk from 'aws-cdk-lib';
// import { Template } from 'aws-cdk-lib/assertions';
// import * as OrderProcessingService from '../lib/order-processing-service-stack';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/order-processing-service-stack.ts
test('SQS Queue Created', () => {
//   const app = new cdk.App();
//     // WHEN
//   const stack = new OrderProcessingService.OrderProcessingServiceStack(app, 'MyTestStack');
//     // THEN
//   const template = Template.fromStack(stack);

//   template.hasResourceProperties('AWS::SQS::Queue', {
//     VisibilityTimeout: 300
//   });
});

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { OrderProcessingServiceStack } from '../lib/order-processing-service-stack';

test('VPC Created', () => {
    const app = new cdk.App();
    const stack = new OrderProcessingServiceStack(app, 'TestStack');
    
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::EC2::VPC', 1);
});

test('RDS Database Created', () => {
    const app = new cdk.App();
    const stack = new OrderProcessingServiceStack(app, 'TestStack');
    
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::RDS::DBInstance', {
        Engine: 'postgres'
    });
});

test('ECS Cluster Created', () => {
    const app = new cdk.App();
    const stack = new OrderProcessingServiceStack(app, 'TestStack');

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ECS::Cluster', 1);
});

test('SQS Queue Created', () => {
    const app = new cdk.App();
    const stack = new OrderProcessingServiceStack(app, 'TestStack');

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::SQS::Queue', 1);
});

